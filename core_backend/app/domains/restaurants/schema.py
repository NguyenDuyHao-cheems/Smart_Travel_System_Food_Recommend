from pydantic import BaseModel, field_validator
from typing import List, Optional, Union, Any
from uuid import UUID


class DishResponse(BaseModel):
    id: Union[str, UUID]

    name: str
    price: int
    image_url: Optional[str] = None
    allergens: Optional[List[str]] = None

    @field_validator('allergens', mode='before')
    @classmethod
    def normalize_allergens(cls, v: Any) -> Optional[List[str]]:
        """Safely convert allergens from any format to List[str]."""
        if v is None:
            return None
        if isinstance(v, list):
            return [str(item) for item in v if item]
        if isinstance(v, str):
            # Handle comma-separated string
            return [a.strip() for a in v.split(',') if a.strip()]
        return None

    class Config:
        from_attributes = True

class ReviewResponse(BaseModel):
    id: str
    reviewer_name: Optional[str] = None
    rating: Optional[float] = None
    text: Optional[str] = None
    date: Optional[str] = None
    
    class Config:
        from_attributes = True

class RestaurantDetailResponse(BaseModel):
    id: Union[str, UUID]

    name: str
    address: str
    google_maps_url: Optional[str] = None
    image_url: Optional[str] = None
    rating_avg: float = 0.0
    total_reviews: Optional[int] = 0
    price_range: Optional[str] = None
    open_time: Optional[str] = None
    close_time: Optional[str] = None
    is_open_now: Optional[bool] = False
    lat: Optional[float] = None
    lng: Optional[float] = None
    tags: List[str] = []
    reviews: List[ReviewResponse] = []
    dishes: List[DishResponse] = []

    class Config:
        from_attributes = True
