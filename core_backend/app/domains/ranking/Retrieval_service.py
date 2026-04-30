"""
Retrieval_service.py — Stage 1 retrieval: lọc thô từ Postgres.

Tách ra từ service.py monolithic để dễ test và maintain.
"""

from sqlalchemy.orm import Session
from sqlalchemy import text
from .models import RestaurantModel, RestaurantTagModel, TagModel

_MAX_RETRIEVAL = 500


class RetrievalService:
    def __init__(self, db: Session):
        self.db = db

    def get_candidates(self, tags, budget, user_location, radius):
        """
        Lọc thô từ Postgres.
        Trả về danh sách RestaurantModel rows (không cần monkey-patch).
        """
        lat, lng = user_location
        deg_radius = radius / 111.0

        query = self.db.query(RestaurantModel).filter(
            RestaurantModel.is_active == True
        )

        # Lọc theo khung tọa độ (bounding box)
        query = query.filter(
            RestaurantModel.lat.between(lat - deg_radius, lat + deg_radius),
            RestaurantModel.lng.between(lng - deg_radius, lng + deg_radius)
        )

        # Join với bảng tags nếu có yêu cầu lọc theo tag
        if tags:
            query = (
                query
                .join(RestaurantTagModel, RestaurantModel.id == RestaurantTagModel.res_id)
                .join(TagModel, TagModel.id == RestaurantTagModel.tag_id)
                .filter(TagModel.name.in_(tags))
            )

        # Trả về tối đa 500 ứng viên để đảm bảo hiệu năng
        return query.distinct().limit(_MAX_RETRIEVAL).all()
