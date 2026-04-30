"""
ranking_service.py — Orchestrates the 2-stage ranking pipeline.

Pipeline:
  1. RetrievalService  → lọc thô từ DB (tags, budget, location, is_active)
  2. FeatureService    → build integer features
  3. AI Engine         → LightFM fills similarity_score, LambdaMART reranks
  4. Fallback          → sort theo distance_m nếu AI Engine không phản hồi
"""

import logging
import numpy as np
import httpx
from typing import List
from sqlalchemy.orm import Session

from .retrieval_service import RetrievalService
from .feature_service import FeatureService
from .schemas import Candidate
from app.core.config import settings

logger = logging.getLogger(__name__)


class RankingService:
    """
    Orchestrates: Retrieval → Feature Building → AI Engine (LightFM+LambdaMART) → Fallback.
    """

    # ------------------------------------------------------------------
    # Cosine Similarity (dùng nội bộ, không gọi AI Engine)
    # ------------------------------------------------------------------

    def rank(self, pref_vector: List[float], candidates: List[Candidate], k: int = 5) -> List[str]:
        """
        Cosine similarity ranking (dùng cho recommendation_service đơn giản).
        Trả về List[str] (res_id).
        """
        if not candidates:
            return []
        pref = np.array(pref_vector, dtype=np.float32)
        norm_pref = np.linalg.norm(pref)
        if norm_pref == 0:
            return [c.res_id for c in candidates[:k]]

        matrix = np.array([c.vector for c in candidates], dtype=np.float32)
        matrix_norms = np.linalg.norm(matrix, axis=1)
        valid_mask = matrix_norms > 1e-8

        if not np.any(valid_mask):
            return [c.res_id for c in candidates[:k]]

        matrix = matrix[valid_mask]
        matrix_norms = matrix_norms[valid_mask]
        valid_candidates = [c for c, v in zip(candidates, valid_mask) if v]

        similarities = (matrix @ pref) / (matrix_norms * norm_pref)
        k = min(k, len(similarities))
        top_idx = np.argpartition(similarities, -k)[-k:]
        top_idx = top_idx[np.argsort(similarities[top_idx])[::-1]]

        return [valid_candidates[i].res_id for i in top_idx]

    # ------------------------------------------------------------------
    # Full Pipeline: Retrieval → Features → AI Engine → Fallback
    # ------------------------------------------------------------------

    async def get_recommendations(self, db: Session, request) -> List[str]:
        """
        Async pipeline chính.

        Args:
            db: SQLAlchemy session
            request: UserRankRequest schema

        Returns:
            List[str] — danh sách res_id theo thứ tự ranking giảm dần.
        """
        # Bước 1: Lọc thô từ DB
        retrieval = RetrievalService(db)
        rows = retrieval.get_candidates(
            request.tags, request.budget, request.user_location, request.radius
        )
        if not rows:
            return []

        # Bước 2: Build integer features
        feature_service = FeatureService()
        featured = feature_service.build_integer_features(
            rows,
            user_lat=request.user_location[0],
            user_lng=request.user_location[1],
            budget=request.budget,
        )

        # Bước 3: Gọi AI Engine (LightFM → LambdaMART)
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                payload = {
                    "user_id": str(request.user_id),
                    "candidates": featured,
                    "top_k": request.k,
                }
                response = await client.post(
                    f"{settings.AI_ENGINE_BASE_URL}/api/v1/ml/rank",
                    json=payload,
                )
                if response.status_code == 200:
                    result = response.json()
                    return result.get("ranked_ids", [])
                else:
                    logger.error(
                        "AI Engine returned %s: %s", response.status_code, response.text
                    )
        except Exception as exc:
            logger.error("AI Engine connection failed: %s", exc)

        # Bước 4: Fallback — sort theo khoảng cách gần nhất
        logger.warning("AI Engine unavailable — falling back to distance sort.")
        featured.sort(key=lambda x: x["distance_m"])
        return [str(c["res_id"]) for c in featured[: request.k]]
