"""
router.py — FastAPI router cho LambdaMART ranking endpoint.

Endpoint: POST /api/v1/ranking/rank
"""

import logging
from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException

from app.core.config import settings
from .lambdamart import LambdaMARTRanker
from .schemas import RankRequest, RankResponse

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Dependency — singleton ranker, lazy-initialized on first request
# ---------------------------------------------------------------------------


@lru_cache(maxsize=1)
def get_ranker() -> LambdaMARTRanker:
    """
    Return the singleton LambdaMARTRanker.
    Loads model from disk on first call; auto-trains if model file is missing.
    lru_cache ensures this is called only once per process lifetime.
    """
    return LambdaMARTRanker(model_path=settings.LAMBDAMART_MODEL_PATH)


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------


@router.post("/rank", response_model=RankResponse)
def rank_candidates(
    request: RankRequest,
    ranker: LambdaMARTRanker = Depends(get_ranker),
) -> RankResponse:
    """
    Rerank restaurant candidates using LambdaMART.

    - Input:  danh sách ứng viên + feature scores (similarity, rating, …)
    - Output: danh sách res_id đã sắp xếp theo relevance score giảm dần
    """
    try:
        candidates_dicts = [c.model_dump() for c in request.candidates]
        ranked_ids, scores = ranker.rank(candidates_dicts, top_k=request.top_k)
        return RankResponse(ranked_ids=ranked_ids, scores=scores)
    except Exception:
        logger.exception(
            "LambdaMART ranking failed for %d candidates", len(request.candidates)
        )
        raise HTTPException(status_code=500, detail="Ranking service error.")
