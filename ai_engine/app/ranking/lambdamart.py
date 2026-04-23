"""
lambdamart.py — LambdaMART ranking engine using LightGBM lambdarank objective.

Lifecycle:
1. Khởi tạo: check model file tại LAMBDAMART_MODEL_PATH.
2. Nếu không tồn tại: auto-train bằng heuristic synthetic data rồi lưu.
3. Inference: predict scores cho candidates, trả về sorted (res_id, score).
"""

import logging
from pathlib import Path
from typing import List, Tuple

import lightgbm as lgb
import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

FEATURE_NAMES: List[str] = [
    "similarity_score",
    "rating_norm",       # rating / 5.0
    "sentiment_norm",    # (sentiment_score + 1) / 2  →  [0, 1]
    "distance_log",      # log1p(distance_km)
    "price_clipped",     # clip(price_normalized, 0, 2)
    "review_log",        # log1p(review_count)
]

# Feature weight vector used to compute heuristic relevance labels during training.
# Order matches FEATURE_NAMES.  Negative weights = lower is better.
_HEURISTIC_WEIGHTS = np.array(
    [0.30, 0.25, 0.20, -0.10, -0.10, 0.05], dtype=np.float32
)

_LGBM_PARAMS: dict = {
    "objective": "lambdarank",
    "metric": "ndcg",
    "ndcg_eval_at": [5, 10],
    "num_leaves": 31,
    "learning_rate": 0.05,
    "min_child_samples": 5,  # handle small synthetic groups
    "verbose": -1,
}

_NUM_BOOST_ROUND = 100
_N_SYNTHETIC_QUERIES = 50
_DOCS_PER_QUERY_RANGE = (10, 31)


# ---------------------------------------------------------------------------
# LambdaMARTRanker
# ---------------------------------------------------------------------------


class LambdaMARTRanker:
    """Singleton-friendly LambdaMART ranker backed by a LightGBM Booster."""

    def __init__(self, model_path: str) -> None:
        self._model_path = Path(model_path)
        self._booster: lgb.Booster | None = None
        self._load_or_train()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def rank(
        self,
        candidates: List[dict],
        top_k: int = 10,
    ) -> Tuple[List[int], List[float]]:
        """
        Rerank candidates using the LambdaMART model.

        Args:
            candidates: List of dicts, each containing res_id + feature fields.
            top_k:      Maximum number of results to return.

        Returns:
            Tuple of (ranked_ids, ranked_scores) sorted by descending score.
        """
        if not candidates:
            return [], []

        if self._booster is None:  # should not happen after __init__
            raise RuntimeError("LambdaMART model is not loaded.")

        X = self._build_feature_matrix(candidates)
        scores: np.ndarray = self._booster.predict(X)  # shape (N,)

        k = min(top_k, len(candidates))
        # argpartition to avoid full sort when k << N, then sort the slice
        top_idx = np.argpartition(scores, -k)[-k:]
        top_idx = top_idx[np.argsort(scores[top_idx])[::-1]]

        ranked_ids = [int(candidates[i]["res_id"]) for i in top_idx]
        ranked_scores = [float(scores[i]) for i in top_idx]
        return ranked_ids, ranked_scores

    # ------------------------------------------------------------------
    # Feature engineering
    # ------------------------------------------------------------------

    def _build_feature_matrix(self, candidates: List[dict]) -> np.ndarray:
        """Convert candidate list to (N, 6) float32 feature matrix."""
        rows = []
        for c in candidates:
            rows.append(
                [
                    float(c.get("similarity_score", 0.0)),
                    float(c.get("rating", 0.0)) / 5.0,
                    (float(c.get("sentiment_score", 0.0)) + 1.0) / 2.0,
                    np.log1p(float(c.get("distance_km", 0.0))),
                    float(np.clip(c.get("price_normalized", 1.0), 0.0, 2.0)),
                    np.log1p(float(c.get("review_count", 0))),
                ]
            )
        return np.array(rows, dtype=np.float32)

    def _compute_heuristic_label(self, features: np.ndarray) -> np.ndarray:
        """
        Produce integer relevance labels (0–3) from raw feature matrix.

        Uses _HEURISTIC_WEIGHTS to score each row, normalises to [0, 1],
        then cuts into quartile-based labels so every label level is used.
        """
        scores: np.ndarray = features @ _HEURISTIC_WEIGHTS  # (N,)
        score_range = float(scores.max() - scores.min())  # np.ptp removed in NumPy 2.0
        if score_range > 1e-8:
            scores = (scores - scores.min()) / score_range
        else:
            scores = np.full_like(scores, 0.5)

        labels = np.zeros(len(scores), dtype=np.int32)
        labels[scores >= 0.25] = 1
        labels[scores >= 0.50] = 2
        labels[scores >= 0.75] = 3
        return labels

    # ------------------------------------------------------------------
    # Model persistence
    # ------------------------------------------------------------------

    def _load_or_train(self) -> None:
        if self._model_path.exists():
            logger.info("Loading LambdaMART model from %s", self._model_path)
            self._booster = lgb.Booster(model_file=str(self._model_path))
        else:
            logger.info(
                "No model found at %s — training from heuristics", self._model_path
            )
            self._train_from_heuristics()

    def _train_from_heuristics(self) -> None:
        """
        Generate synthetic training data (random feature vectors labelled by
        heuristic scoring) and train the LambdaMART model.

        Synthetic queries give LightGBM enough group structure to learn
        meaningful feature weights even without real user interaction data.
        """
        rng = np.random.default_rng(seed=42)
        all_features: List[np.ndarray] = []
        all_labels: List[np.ndarray] = []
        groups: List[int] = []

        low, high = _DOCS_PER_QUERY_RANGE
        for _ in range(_N_SYNTHETIC_QUERIES):
            n_docs = int(rng.integers(low, high))
            features = rng.random((n_docs, len(FEATURE_NAMES))).astype(np.float32)
            labels = self._compute_heuristic_label(features)
            all_features.append(features)
            all_labels.append(labels)
            groups.append(n_docs)

        X = np.vstack(all_features)
        y = np.concatenate(all_labels)

        dataset = lgb.Dataset(
            X,
            label=y,
            group=groups,
            feature_name=FEATURE_NAMES,
            free_raw_data=False,
        )

        logger.info(
            "Training LambdaMART on %d synthetic queries (%d total docs)",
            _N_SYNTHETIC_QUERIES,
            len(y),
        )
        self._booster = lgb.train(
            _LGBM_PARAMS,
            dataset,
            num_boost_round=_NUM_BOOST_ROUND,
            valid_sets=[dataset],
            callbacks=[lgb.log_evaluation(period=20)],
        )

        self._model_path.parent.mkdir(parents=True, exist_ok=True)
        self._booster.save_model(str(self._model_path))
        logger.info("LambdaMART model saved to %s", self._model_path)
