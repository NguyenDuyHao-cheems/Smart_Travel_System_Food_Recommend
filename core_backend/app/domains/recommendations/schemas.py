from pydantic import BaseModel
from typing import List
from app.domains.search.schemas import RecommendResult

class HomeRecommendationResponse(BaseModel):
    results: List[RecommendResult]
