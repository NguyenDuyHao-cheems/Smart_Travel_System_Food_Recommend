from pydantic import BaseModel, Field
from typing import List

class Candidate(BaseModel):
    res_id: int
    vector: List[float]  # embedding của restaurant

class RankRequest(BaseModel):
    user_id: int
    pref_vector: List[float]

    k: int = Field(default=5, ge=1, le=50)
    offset: int = Field(default=0, ge=0)

    tags: List[str] = Field(default_factory=list)
    budget: float = Field(default=100.0, ge=0.0)

    user_location: List[float] = Field(default_factory=lambda: [0.0, 0.0])
    radius: float = Field(default=1.0, ge=0.0)
    
class RankResponse(BaseModel):
    top_ids: List[int]
