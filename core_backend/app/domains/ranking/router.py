from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.dependencies import get_db
from .schemas import UserRankRequest, RankResponse
from .ranking_service import RankingService
from functools import lru_cache

import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@lru_cache(maxsize=1)
def get_ranking_service() -> RankingService:
    return RankingService()


@router.post("/ml/rank", response_model=RankResponse, deprecated=True)
async def rank_restaurants(
    request: UserRankRequest,
    db: Session = Depends(get_db),
    service: RankingService = Depends(get_ranking_service)
):
    """
    [DEPRECATED] Sử dụng /search/recommend thay thế.
    Endpoint này được giữ lại cho mục đích nội bộ và debug pipeline ranking.
    2. Feature Building: Integer features (×100)
    3. AI Engine: LightFM similarity → LambdaMART rerank
    4. Fallback: Sort theo khoảng cách nếu AI Engine sập
    """
    try:
        ranked_ids = await service.get_recommendations(db, request)
        return RankResponse(ranked_ids=ranked_ids)
    except Exception as e:
        # Fix I6: log chi tiết nội bộ, trả về generic message cho client
        logger.exception("Ranking pipeline failed for user_id=%s", request.user_id)
        raise HTTPException(
            status_code=500,
            detail="Internal server error. Please try again later."
        )
