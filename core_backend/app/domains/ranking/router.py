from fastapi import APIRouter
from .schemas import RankRequest, RankResponse, Candidate
from .service import RankingService

router = APIRouter()
service = RankingService()

# giả lập DB candidates (thực tế sẽ query từ DB)
def get_candidates_from_db():
    return [
        Candidate(res_id=1, vector=[0.1, 0.2, 0.3]),
        Candidate(res_id=2, vector=[0.4, 0.5, 0.6]),
        Candidate(res_id=3, vector=[0.2, 0.1, 0.9]),
    ]

@router.post("/ml/rank-candidates", response_model=RankResponse)
def rank_candidates(request: RankRequest):
    candidates =  get_candidates_from_db()
    service.build_cache(service.get_key(request.pref_vector), request.pref_vector, candidates=candidates)
    top_ids = service.rank(request.pref_vector, candidates, request.k, request.offset)
    return RankResponse(top_ids=top_ids)