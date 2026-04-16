from fastapi import APIRouter, Depends, HTTPException
from .schemas import RankRequest, RankResponse
from .service import RankingService

router = APIRouter()


def get_ranking_service() -> RankingService:
    return RankingService()


@router.post("/ml/rank-candidates", response_model=RankResponse)
def rank_candidates(
    request: RankRequest,
    service: RankingService = Depends(get_ranking_service),  # Dependency injection
):
    try:
        top_ids = service.rank(request.pref_vector, request.candidates)
        return RankResponse(top_ids=top_ids)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) # Handle ValueError
