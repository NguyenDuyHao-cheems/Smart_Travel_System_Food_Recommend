from fastapi import APIRouter
from .schemas import RankRequest, RankResponse
from .service import RankingService

router = APIRouter()
service = RankingService()

@router.post("/ml/rank-candidates", response_model=RankResponse)
def rank_candidates(request: RankRequest):
    top_ids = service.rank(request.pref_vector, request.candidates)
    return RankResponse(top_ids=top_ids)