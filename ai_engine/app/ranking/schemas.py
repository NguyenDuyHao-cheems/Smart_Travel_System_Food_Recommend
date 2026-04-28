from pydantic import BaseModel, Field
from typing import List, Optional

class CandidateWithFeatures(BaseModel):
    res_id: str
    rating: int = 0
    sentiment_score: int = 0
    distance_m: int = 0
    price_normalized: int = 0
    review_count: int = 0
    similarity_score: int = 0
    is_open: int = 0

class RankRequestPayload(BaseModel):
    user_id: str
    candidates: List[CandidateWithFeatures]
    top_k: int = 10

class RankResponse(BaseModel):
    ranked_ids: List[str]
    scores: Optional[List[float]] = None