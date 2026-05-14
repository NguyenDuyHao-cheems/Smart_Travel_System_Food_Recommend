from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

class DishResponse(BaseModel):
    id: UUID
    name: str
    price: int
    image_url: Optional[str] = None

    class Config:
        from_attributes = True

class RestaurantDetailResponse(BaseModel):
    id: UUID
    name: str
    address: str
    google_maps_url: Optional[str] = None
    image_url: Optional[str] = None
    rating_avg: float = 0.0
    lat: Optional[float] = None
    lng: Optional[float] = None
    dishes: List[DishResponse] = []

    class Config:
        from_attributes = True
