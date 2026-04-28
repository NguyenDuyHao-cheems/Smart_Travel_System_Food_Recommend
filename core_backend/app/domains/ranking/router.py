from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.dependencies import get_db
from .schemas import UserRankRequest, RankResponse
from .ranking_service import RankingService

router = APIRouter()

@router.post("/ml/rank", response_model=RankResponse)
async def rank_restaurants(
    request: UserRankRequest,
    db: Session = Depends(get_db)
):
    try:
        service = RankingService()
        ranked_ids = await service.get_recommendations(db, request)
        return RankResponse(ranked_ids=ranked_ids)
    except Exception as e:
        # I6: Error leaking fix - log details internally, return generic message to client
        import logging
        logging.getLogger(__name__).error(f"Ranking failed: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Internal server error. Please try again later."
        )