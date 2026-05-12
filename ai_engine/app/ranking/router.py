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
