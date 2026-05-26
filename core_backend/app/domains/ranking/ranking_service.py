"""
ranking_service.py — Orchestrates the 2-stage ranking pipeline.

Pipeline:
  1. RetrievalService  → semantic retrieval từ DB (pgvector cosine + budget, location)
  2. FeatureService    → build integer features
  3. AI Engine         → LambdaMART reranks
  4. Fallback          → sort theo distance_m nếu AI Engine không phản hồi
"""

import logging
import httpx
from typing import List
from sqlalchemy.orm import Session

from .retrieval_service import RetrievalService
from .feature_service import FeatureService
from app.core.config import settings

logger = logging.getLogger(__name__)


class RankingService:
    """
    Orchestrates: Semantic Retrieval → Feature Building → AI Engine (LambdaMART) → Fallback.
    """

    async def get_recommendations(self, db: Session, request) -> List[str]:
        """
        [DEPRECATED] Dùng `app.services.recommendation_service.recommend` thay thế.
        Async pipeline chính cho endpoint nội bộ.

        Args:
            db: SQLAlchemy session
            request: UserRankRequest schema (chứa query_vector cho semantic retrieval)

        Returns:
            List[str] — danh sách res_id theo thứ tự ranking giảm dần.
        """
        # Bước 1: Semantic retrieval từ DB (pgvector cosine distance)
        retrieval = RetrievalService(db)
        rows = retrieval.get_candidates(
            budget=request.budget,
            query_vector=getattr(request, "query_vector", None),
            query_text=getattr(request, "query", ""),
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
            query_text=getattr(request, "query", ""),
        )

        # Bước 3: Gọi AI Engine (LambdaMART rerank)
        try:
            from app.services.ai_client import get_ai_client
            ai_client = await get_ai_client()
            result = await ai_client.rank_candidates(
                user_id=str(request.user_id),
                candidates=featured,
                top_k=request.k,
            )
            return result.get("ranked_ids", [])
        except Exception as exc:
            logger.error("AI Engine ranking failed: %s", exc)

        # Bước 4: Fallback — sort theo khoảng cách gần nhất
        logger.warning("AI Engine unavailable — falling back to distance sort.")
        featured.sort(key=lambda x: x["distance_m"])
        return [str(c["res_id"]) for c in featured[: request.k]]

