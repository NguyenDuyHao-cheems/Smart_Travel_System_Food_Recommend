"""
retrieval_service.py — Stage 1 retrieval: lọc và sắp xếp semantic từ Postgres.

Dùng pgvector cosine distance (<=>) để ORDER BY similarity khi có query_vector.
Tách ra từ service.py monolithic để dễ test và maintain.
"""

from typing import List, Optional

from sqlalchemy.orm import Session
from sqlalchemy import cast, func, Integer, case, or_, and_

from .models import RestaurantModel

_MAX_RETRIEVAL = 500


class RetrievalService:
    def __init__(self, db: Session):
        self.db = db

    def get_candidates(
        self,
        budget: int,
        user_location: List[float],
        radius: float,
        query_vector: Optional[List[float]] = None,
    ):
        """
        Retrieval từ Postgres với semantic ordering.

        Khi có query_vector:
          - Lọc bỏ restaurants chưa có embedding_vector.
          - ORDER BY embedding_vector <=> query_vector (Cosine Distance, thấp = gần nhất).

        Khi không có query_vector:
          - Fallback ORDER BY rating_avg DESC.

        Returns:
            Danh sách RestaurantModel rows, tối đa _MAX_RETRIEVAL.
        """
        lat, lng = user_location
        deg_radius = radius / 111.0
        # đang hoạt động
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
            raw_min_price_str = case(
                (
                    RestaurantModel.price_range.contains("-"),
                    func.split_part(RestaurantModel.price_range, "-", 1),
                ),
                else_=RestaurantModel.price_range,
            )
            raw_max_price_str = case(
                (
                    RestaurantModel.price_range.contains("-"),
                    func.split_part(RestaurantModel.price_range, "-", 2),
                ),
                else_=RestaurantModel.price_range,
            )
            
            clean_min_price_str = func.regexp_replace(raw_min_price_str, r'\D', '', 'g')
            clean_max_price_str = func.regexp_replace(raw_max_price_str, r'\D', '', 'g')
            
            # Sử dụng coalesce để chuyển giá trị null/rỗng thành 0
            clean_min_price_int = func.coalesce(cast(func.nullif(clean_min_price_str, ''), Integer), 0)
            clean_max_price_int = func.coalesce(cast(func.nullif(clean_max_price_str, ''), Integer), 0)

            query = query.filter(
                or_(
                    # Bao gồm các quán không có khoảng giá (0-0 hoặc dữ liệu trống)
                    and_(clean_min_price_int == 0, clean_max_price_int == 0),
                    # Quán có giá min hoặc max nằm trong budget
                    clean_min_price_int <= budget,
                    clean_max_price_int <= budget,
                )
            )

        # Semantic ordering bằng pgvector cosine distance
        if query_vector is not None:
            distance = RestaurantModel.embedding_vector.cosine_distance(query_vector).label("distance")
            query = query.add_columns(distance).filter(
                RestaurantModel.embedding_vector.isnot(None)
            ).order_by(distance)
            
            results = query.limit(_MAX_RETRIEVAL).all()
            candidates = []
            for row in results:
                model = row[0]
                model.distance = row[1]
                candidates.append(model)
            return candidates
        else:
            query = query.order_by(
                RestaurantModel.rating_avg.desc().nullslast()
            )
            return query.limit(_MAX_RETRIEVAL).all()
