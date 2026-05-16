from pydantic import BaseModel
from typing import List, Optional, Union
from uuid import UUID


class DishResponse(BaseModel):
    id: Union[str, UUID]

    name: str
    price: int
    image_url: Optional[str] = None

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
