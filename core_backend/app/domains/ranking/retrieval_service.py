"""
retrieval_service.py — Stage 1 retrieval: lọc thô từ Postgres.

Tách ra từ service.py monolithic để dễ test và maintain.
"""

from sqlalchemy.orm import Session
from sqlalchemy import cast, func, Integer, case

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
        # Lọc budget trực tiếp trong DB.
        # price_range đang lưu dạng "50000-100000" hoặc "50000".
        # budget <= 0 được hiểu là không giới hạn ngân sách.
        if budget and budget > 0:
            max_price_expr = case(
                (
                    RestaurantModel.price_range.contains("-"),
                    cast(func.split_part(RestaurantModel.price_range, "-", 2), Integer),
                ),
                else_=cast(RestaurantModel.price_range, Integer),
            )

            query = query.filter(
                RestaurantModel.price_range.isnot(None),
                max_price_expr <= budget,
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
