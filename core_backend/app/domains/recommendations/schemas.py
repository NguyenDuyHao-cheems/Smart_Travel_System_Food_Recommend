from pydantic import BaseModel
from typing import List
from app.domains.search.schemas import RecommendResult

class HomeRecommendationResponse(BaseModel):
    results: List[RecommendResult]

class GroupRecommendationRequest(BaseModel):
    friend_ids: List[str]
    lat: float
    lng: float
    limit: int = 16
    budget: int | None = None
    radius: float = 5.0

class GroupRecommendationResponse(BaseModel):
    results: List[RecommendResult]
    group_size: int
    applied_vegetarian_filter: bool
    applied_allergies: List[str]

