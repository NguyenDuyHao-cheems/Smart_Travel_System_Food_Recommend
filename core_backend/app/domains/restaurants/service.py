from sqlalchemy.orm import Session
from app.domains.ranking.models import RestaurantModel, DishModel

def get_restaurant_with_dishes(restaurant_id: str, db: Session):
    restaurant = db.query(RestaurantModel).filter(RestaurantModel.id == restaurant_id).first()
    if not restaurant:
        return None
    
    dishes_data = db.query(
        DishModel.name,
        DishModel.price,
        DishModel.image_url
    ).filter(DishModel.res_id == restaurant_id).all()
    
    dishes = [
        {"name": d.name, "price": d.price, "image_url": d.image_url}
        for d in dishes_data
    ]
    
    return {
        "restaurant": {
            "id": str(restaurant.id),
            "name": restaurant.name,
            "address": restaurant.address,
            "google_maps_url": restaurant.google_maps_url
        },
        "dishes": dishes
    }
