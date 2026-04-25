from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.domains.users.router import get_db # Kiểm tra lại path này cho chuẩn nhé
from .schemas import RankRequest, RankResponse
from .ranking_service import RankingService

router = APIRouter()

@router.post("/ml/rank-candidates", response_model=RankResponse)
async def rank_candidates(request: RankRequest, db: Session = Depends(get_db)):
    try:
        service = RankingService(db)
        top_results = await service.get_recommendations(request)
        
        # Trả về status success và danh sách món ăn đầy đủ info
        return RankResponse(status="success", results=top_results)
    except Exception as e:
        print(f"Ranking Router Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))