from sqlalchemy.orm import Session
from sqlalchemy import cast, Integer
from .models import RestaurantModel, RestaurantTagModel, TagModel

class RetrievalService:
    def __init__(self, db: Session):
        self.db = db

    def get_candidates(self, tags, budget, user_location, radius):
        lat, lng = user_location
        deg_radius = radius / 111.0 
        
        # Sửa query: Sử dụng cast để ép kiểu price_range từ String sang Integer
        query = self.db.query(RestaurantModel).filter(
            RestaurantModel.is_active == True,
            cast(RestaurantModel.price_range, Integer) <= budget
        )

        # Lọc theo khung tọa độ
        query = query.filter(
            RestaurantModel.lat.between(lat - deg_radius, lat + deg_radius),
            RestaurantModel.lng.between(lng - deg_radius, lng + deg_radius)
        )

        # Join với bảng tags nếu có yêu cầu lọc theo tag
        if tags:
            query = query.join(RestaurantTagModel, RestaurantModel.id == RestaurantTagModel.res_id) \
                         .join(TagModel, TagModel.id == RestaurantTagModel.tag_id) \
                         .filter(TagModel.name.in_(tags))
        
        # Trả về tối đa 500 ứng viên để đảm bảo hiệu năng
        return query.distinct().limit(500).all()