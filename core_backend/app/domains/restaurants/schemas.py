from pydantic import BaseModel
from typing import List, Optional

class Dish(BaseModel):
    name: str
    price: int
    image_url: Optional[str] = None

    class Config:
        from_attributes = True

class RestaurantDetail(BaseModel):
    id: str
    name: str
    address: Optional[str] = None
    google_maps_url: Optional[str] = None

    class Config:
        from_attributes = True

class RestaurantWithDishes(BaseModel):
    restaurant: RestaurantDetail
    dishes: List[Dish]
