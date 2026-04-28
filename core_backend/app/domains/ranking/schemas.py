from pydantic import BaseModel, Field
from typing import List


class Candidate(BaseModel):
    res_id: str = Field(..., description="Restaurant identifier")
    vector: List[float] = Field(..., description="Restaurant embedding vector")


class RankRequest(BaseModel):
    user_id: int = Field(..., description="User identifier")
    pref_vector: List[float] = Field(..., description="User preference vector")

    k: int = Field(default=5, ge=1, le=50, description="Maximum number of results")
    offset: int = Field(default=0, ge=0, description="Pagination offset")

    tags: List[str] = Field(default_factory=list, description="Requested tag names")
    budget: float = Field(default=100.0, ge=0.0, description="Requested maximum budget")

    user_location: List[float] = Field(
        default_factory=lambda: [0.0, 0.0],
        description="User location as [lat, lng]",
    )
    radius: float = Field(default=1.0, ge=0.0, description="Search radius in km")


class RankResponse(BaseModel):
    top_ids: List[str] = Field(..., description="Ranked restaurant identifiers")
