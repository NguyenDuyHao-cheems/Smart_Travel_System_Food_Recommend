"""
router.py — FastAPI router cho AI Engine ranking endpoint.

Endpoint: POST /api/v1/ml/rank
Pipeline: LightFM (similarity_score) → LambdaMART (rerank)
"""

import logging
from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException

from app.core.config import settings
from .service import AIRankingService
from .schemas import RankRequestPayload, RankResponse

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Singleton ranking service — lazy-initialized on first request
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def get_ranking_service() -> AIRankingService:
    """
    Return the singleton AIRankingService.
    lru_cache ensures LightFM + LambdaMART are loaded only once per process.
    """
    return AIRankingService()


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/ml/rank", response_model=RankResponse)
async def rank_candidates(
    payload: RankRequestPayload,
    service: AIRankingService = Depends(get_ranking_service),
) -> RankResponse:
    """
    Xếp hạng restaurant candidates theo pipeline 2 tầng:
      Tầng 1: LightFM điền similarity_score
      Tầng 2: LambdaMART rerank theo tất cả features

    - Input:  user_id + danh sách candidates với integer features
    - Output: ranked_ids (List[str]) + scores (List[float])
    """
    try:
        result = service.rank(payload.model_dump())
        return RankResponse(
            ranked_ids=result["ranked_ids"],
            scores=result.get("scores"),
        )
    except Exception:
        logger.exception(
            "Ranking pipeline failed for %d candidates", len(payload.candidates)
        )
        raise HTTPException(status_code=500, detail="Ranking service error.")


# ---------------------------------------------------------------------------
# LightFM Recommendation Endpoints
# ---------------------------------------------------------------------------
from fastapi import Query
from typing import List
from app.ranking.lightfm.recommendation_service import recommendation_service as lf_rec_service

@router.post("/admin/recommendations/reload")
def reload_recommendations():
    """Reload the LightFM model and mapping files from disk."""
    try:
        lf_rec_service.load_model()
        return {"message": "Model đã được nạp lại thành công!"}
    except Exception as e:
        logger.error(f"Error reloading LightFM model: {e}")
        raise HTTPException(status_code=500, detail=f"Error reloading model: {str(e)}")

@router.get("/restaurants/recommendations", response_model=List[str])
def get_lightfm_recommendations(
    user_id: str = Query(..., description="The ID of the user"),
    limit: int = Query(10, description="The maximum number of recommendations to return")
) -> List[str]:
    """Get the LightFM collaborative filtering recommendations (restaurant IDs) for a user."""
    try:
        return lf_rec_service.get_recommendations(user_id, limit=limit)
    except Exception as e:
        logger.error(f"Error getting LightFM recommendations for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving recommendations.")
