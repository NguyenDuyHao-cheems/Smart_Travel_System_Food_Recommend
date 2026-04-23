"""
test_unit_ranking.py — Pure unit tests for LambdaMART components.

No HTTP, no Docker.  Uses `tmp_ranker` fixture from conftest (trains once).
"""

import numpy as np
import pytest


# ---------------------------------------------------------------------------
# Feature matrix building
# ---------------------------------------------------------------------------


class TestBuildFeatureMatrix:
    """Validates _build_feature_matrix output shape and normalisation."""

    def test_output_shape_single_candidate(self, tmp_ranker):
        candidates = [
            {
                "res_id": 1,
                "similarity_score": 0.8,
                "rating": 4.5,
                "sentiment_score": 0.3,
                "distance_km": 1.5,
                "price_normalized": 0.8,
                "review_count": 100,
            }
        ]
        X = tmp_ranker._build_feature_matrix(candidates)
        assert X.shape == (1, 6), "Feature matrix must have 6 columns"
        assert X.dtype == np.float32

    def test_output_shape_multiple_candidates(self, tmp_ranker, sample_candidates):
        X = tmp_ranker._build_feature_matrix(sample_candidates)
        assert X.shape == (10, 6)

    def test_rating_normalised_to_0_1(self, tmp_ranker):
        """rating=5.0 → feature column 1 == 1.0"""
        candidates = [
            {
                "res_id": 1,
                "similarity_score": 0.0,
                "rating": 5.0,
                "sentiment_score": 0.0,
                "distance_km": 0.0,
                "price_normalized": 1.0,
                "review_count": 0,
            }
        ]
        X = tmp_ranker._build_feature_matrix(candidates)
        assert X[0, 1] == pytest.approx(1.0), "rating 5.0 should normalise to 1.0"

    def test_sentiment_minus1_maps_to_0(self, tmp_ranker):
        """sentiment_score=-1.0 → (−1+1)/2 = 0.0"""
        candidates = [
            {
                "res_id": 1,
                "similarity_score": 0.0,
                "rating": 0.0,
                "sentiment_score": -1.0,
                "distance_km": 0.0,
                "price_normalized": 1.0,
                "review_count": 0,
            }
        ]
        X = tmp_ranker._build_feature_matrix(candidates)
        assert X[0, 2] == pytest.approx(0.0), "sentiment −1 should map to 0"

    def test_sentiment_plus1_maps_to_1(self, tmp_ranker):
        """sentiment_score=1.0 → (1+1)/2 = 1.0"""
        candidates = [
            {
                "res_id": 1,
                "similarity_score": 0.0,
                "rating": 0.0,
                "sentiment_score": 1.0,
                "distance_km": 0.0,
                "price_normalized": 1.0,
                "review_count": 0,
            }
        ]
        X = tmp_ranker._build_feature_matrix(candidates)
        assert X[0, 2] == pytest.approx(1.0)

    def test_distance_log_scaled(self, tmp_ranker):
        """distance_km uses log1p — zero distance maps to 0."""
        candidates = [
            {
                "res_id": 1,
                "similarity_score": 0.0,
                "rating": 0.0,
                "sentiment_score": 0.0,
                "distance_km": 0.0,
                "price_normalized": 1.0,
                "review_count": 0,
            }
        ]
        X = tmp_ranker._build_feature_matrix(candidates)
        assert X[0, 3] == pytest.approx(0.0), "log1p(0) must be 0"

    def test_missing_fields_default_to_zero(self, tmp_ranker):
        """Candidates with missing feature fields should not raise."""
        candidates = [{"res_id": 99}]
        X = tmp_ranker._build_feature_matrix(candidates)
        assert X.shape == (1, 6)
        # All values should be finite (no NaN/Inf)
        assert np.all(np.isfinite(X))


# ---------------------------------------------------------------------------
# Heuristic label computation
# ---------------------------------------------------------------------------


class TestComputeHeuristicLabel:
    """Validates _compute_heuristic_label label range and shape."""

    def test_labels_in_range_0_to_3(self, tmp_ranker):
        features = np.random.rand(20, 6).astype(np.float32)
        labels = tmp_ranker._compute_heuristic_label(features)
        assert labels.min() >= 0
        assert labels.max() <= 3

    def test_labels_correct_shape(self, tmp_ranker):
        features = np.random.rand(15, 6).astype(np.float32)
        labels = tmp_ranker._compute_heuristic_label(features)
        assert labels.shape == (15,)

    def test_labels_integer_dtype(self, tmp_ranker):
        features = np.random.rand(10, 6).astype(np.float32)
        labels = tmp_ranker._compute_heuristic_label(features)
        assert np.issubdtype(labels.dtype, np.integer)

    def test_uniform_features_no_crash(self, tmp_ranker):
        """All-same features → ptp==0, should not raise ZeroDivisionError."""
        features = np.ones((5, 6), dtype=np.float32) * 0.5
        labels = tmp_ranker._compute_heuristic_label(features)
        assert labels.shape == (5,)


# ---------------------------------------------------------------------------
# rank() API
# ---------------------------------------------------------------------------


class TestRank:
    """Validates rank() return types, ordering, and edge cases."""

    def test_rank_returns_tuple_of_lists(self, tmp_ranker, sample_candidates):
        result = tmp_ranker.rank(sample_candidates, top_k=5)
        assert isinstance(result, tuple) and len(result) == 2
        ranked_ids, scores = result
        assert isinstance(ranked_ids, list)
        assert isinstance(scores, list)

    def test_rank_correct_top_k_count(self, tmp_ranker, sample_candidates):
        ranked_ids, scores = tmp_ranker.rank(sample_candidates, top_k=5)
        assert len(ranked_ids) == 5
        assert len(scores) == 5

    def test_rank_fewer_candidates_than_top_k(self, tmp_ranker):
        """When candidates < top_k, return all candidates."""
        candidates = [
            {
                "res_id": 42,
                "similarity_score": 0.9,
                "rating": 4.5,
                "sentiment_score": 0.5,
                "distance_km": 0.5,
                "price_normalized": 0.5,
                "review_count": 50,
            }
        ]
        ranked_ids, scores = tmp_ranker.rank(candidates, top_k=10)
        assert len(ranked_ids) == 1
        assert ranked_ids[0] == 42

    def test_empty_candidates_returns_empty(self, tmp_ranker):
        ranked_ids, scores = tmp_ranker.rank([], top_k=5)
        assert ranked_ids == []
        assert scores == []

    def test_scores_are_descending(self, tmp_ranker, sample_candidates):
        _, scores = tmp_ranker.rank(sample_candidates, top_k=10)
        assert all(
            scores[i] >= scores[i + 1] for i in range(len(scores) - 1)
        ), "Scores must be in descending order"

    def test_all_ranked_ids_come_from_input(self, tmp_ranker, sample_candidates):
        input_ids = {c["res_id"] for c in sample_candidates}
        ranked_ids, _ = tmp_ranker.rank(sample_candidates, top_k=len(sample_candidates))
        assert all(rid in input_ids for rid in ranked_ids)

    def test_no_duplicate_ids_in_result(self, tmp_ranker, sample_candidates):
        ranked_ids, _ = tmp_ranker.rank(sample_candidates, top_k=len(sample_candidates))
        assert len(ranked_ids) == len(set(ranked_ids)), "Duplicate IDs in ranked output"


# ---------------------------------------------------------------------------
# Model persistence
# ---------------------------------------------------------------------------


class TestModelPersistence:
    """Validates that the model file is created after training."""

    def test_model_file_created(self, tmp_ranker):
        assert tmp_ranker._model_path.exists(), (
            f"Model file should exist at {tmp_ranker._model_path}"
        )

    def test_booster_not_none(self, tmp_ranker):
        assert tmp_ranker._booster is not None
