from pydantic import BaseModel, Field
from typing import List


class RestaurantTagResult(BaseModel):
    res_id: str
    restaurant_name: str | None = None
    tags: List[str]
    status: str


class TaggingResponse(BaseModel):
    processed: int = Field(..., description="Number of restaurants processed")
    skipped: int = Field(..., description="Number of restaurants skipped")
    results: List[RestaurantTagResult]
