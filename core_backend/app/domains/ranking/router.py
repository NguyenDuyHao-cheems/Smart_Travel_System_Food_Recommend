from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

# Import đúng đường dẫn cấu trúc thư mục của Bảo
from .schemas import RankRequest, RankResponse
from .service import RankingService
from app.core.database import SessionLocal 

router = APIRouter()

from functools import lru_cache
from app.core.dependencies import get_db
import logging

logger = logging.getLogger(__name__)

@lru_cache(maxsize=1)
def get_ranking_service() -> RankingService:
    return RankingService()

@router.post("/ml/rank-candidates", response_model=RankResponse)
def rank_candidates(
    request: RankRequest,
    db: Session = Depends(get_db),
    service: RankingService = Depends(get_ranking_service)
):
    """
    Endpoint thực hiện Pipeline:
    1. Retrieval: Lọc thô từ Postgres (tags, budget, location, is_open)
    2. Ranking: Xếp hạng bằng NumPy Cosine Similarity
    """
    try:
        # Gọi hàm điều phối chính trong RankingService
        top_ids = service.get_recommendations(db, request)
        # Trả về kết quả theo đúng Schema RankResponse
        return RankResponse(top_ids=top_ids)
        
    except Exception as e:
        logger.exception("Ranking pipeline failed for user_id=%s", request.user_id)
        raise HTTPException(
            status_code=500, 
            detail="Internal server error. Please try again later."
        )
