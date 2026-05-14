from sqlalchemy.orm import Session
from typing import Optional
from app.domains.ranking.models import RestaurantModel, DishModel

class RestaurantRepository:
    @staticmethod
    def get_by_id(db: Session, restaurant_id: str) -> Optional[RestaurantModel]:
        return db.query(RestaurantModel).filter(RestaurantModel.id == restaurant_id).first()

    @staticmethod
    def get_dishes_by_restaurant_id(db: Session, restaurant_id: str):
        return db.query(DishModel).filter(DishModel.res_id == restaurant_id).all()
