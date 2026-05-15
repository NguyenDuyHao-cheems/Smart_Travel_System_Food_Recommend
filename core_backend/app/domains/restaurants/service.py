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
        tags = [tag.name for tag in (restaurant.tags or [])]
        reviews = RestaurantRepository.get_reviews_by_restaurant_id(db, restaurant_id, limit=10)
        
        return RestaurantDetailResponse(
            id=restaurant.id,
            name=restaurant.name,
            address=restaurant.address,
            google_maps_url=restaurant.google_maps_url,
            image_url=restaurant.image_url,
            rating_avg=restaurant.rating_avg or 0.0,
            total_reviews=getattr(restaurant, "total_reviews", 0) or 0,
            price_range=getattr(restaurant, "price_range", None),
            open_time=str(restaurant.open_time)[:5] if getattr(restaurant, "open_time", None) else None,
            close_time=str(restaurant.close_time)[:5] if getattr(restaurant, "close_time", None) else None,
            is_open_now=getattr(restaurant, "is_open_now", False),
            lat=restaurant.lat,
            lng=restaurant.lng,
            tags=tags,
            reviews=[
                {
                    "id": str(r.id), 
                    "reviewer_name": r.reviewer_name, 
                    "rating": r.rating, 
                    "text": r.text, 
                    "date": str(r.date) if r.date else None
                }
                for r in reviews
            ],
            dishes=[DishResponse.model_validate(d) for d in dishes]
        )
