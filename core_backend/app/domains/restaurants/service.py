from sqlalchemy.orm import Session
from fastapi import HTTPException
from .repository import RestaurantRepository
from .schema import RestaurantDetailResponse, DishResponse

class RestaurantService:
    @staticmethod
    async def get_restaurant_detail(db: Session, restaurant_id: str) -> RestaurantDetailResponse:
        restaurant = RestaurantRepository.get_by_id(db, restaurant_id)
        if not restaurant:
            raise HTTPException(status_code=404, detail="Không tìm thấy nhà hàng này.")
        
        dishes = RestaurantRepository.get_dishes_by_restaurant_id(db, restaurant_id)
        
        return RestaurantDetailResponse(
            id=restaurant.id,
            name=restaurant.name,
            address=restaurant.address,
            google_maps_url=restaurant.google_maps_url,
            image_url=restaurant.image_url,
            rating_avg=restaurant.rating_avg or 0.0,
            lat=restaurant.lat,
            lng=restaurant.lng,
            dishes=[DishResponse.model_validate(d) for d in dishes]
        )
