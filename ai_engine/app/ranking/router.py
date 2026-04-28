from fastapi import APIRouter, HTTPException
from app.ranking.service import AIRankingService
from app.ranking.schemas import RankRequestPayload, RankResponse # Import schema vừa tạo

router = APIRouter()
ranking_service = AIRankingService()

@router.post("/ml/rank", response_model=RankResponse)
async def rank_candidates(payload: RankRequestPayload):
    try:
        # Pydantic tự động ép kiểu và validate tại đây
        # Chúng ta convert payload sang dict để khớp với hàm rank hiện tại của Bảo
        result = ranking_service.rank(payload.model_dump())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))