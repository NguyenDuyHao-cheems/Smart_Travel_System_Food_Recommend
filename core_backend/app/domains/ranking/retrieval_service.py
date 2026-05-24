"""
retrieval_service.py — Stage 1 retrieval: lọc và sắp xếp semantic từ Postgres.

Dùng pgvector cosine distance (<=>) để ORDER BY similarity khi có query_vector.
Tách ra từ service.py monolithic để dễ test và maintain.
"""

import unicodedata
import logging
import math
from typing import List, Optional

from sqlalchemy.orm import Session
from sqlalchemy import cast, func, Integer, case, or_, and_

from .models import RestaurantModel, DishModel

_MAX_RETRIEVAL = 500

logger = logging.getLogger(__name__)


def _normalize_vietnamese(text: str) -> str:
    """Remove diacritics and normalize Vietnamese text for ASCII comparison."""
    if not text:
        return ""
    text = text.lower().strip()
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return text.replace("đ", "d")


QUERY_TAG_MAP = {
    "gà": "gà", "ga": "gà", "thịt gà": "gà", "gà rán": "gà", "gà quay": "gà",
    "bò": "bò", "thịt bò": "bò", "bít tết": "bò",
    "cơm": "cơm", "cơm tấm": "cơm",
    "phở": "phở",
    "bún": "bún", "bún bò": "bún", "bún chả": "bún",
    "mì": "mì", "mì ý": "mì", "mì ramen": "mì",
    "hải sản": "hải sản", "cua": "hải sản", "cá": "hải sản",
    "lẩu": "lẩu", "shabu": "lẩu",
    "nướng": "nướng", "bbq": "nướng",
    "trà sữa": "trà sữa", "tra sua": "trà sữa",
    "cà phê": "cà phê", "cafe": "cà phê",
    "sushi": "sushi", "đồ sashimi": "sushi",
    "pizza": "pizza",
    "burger": "burger",
    "tráng miệng": "tráng miệng", "dessert": "tráng miệng",
    "cháo": "cháo",
    "healthy": "healthy", "salad": "healthy",
    "chay": "món chay", "đồ chay": "món chay", "vegetarian": "món chay",
    "heo": "heo", "thịt heo": "heo", "thịt pork": "heo",
}


def extract_tag(query_text: str) -> Optional[str]:
    """Extract a standardized food tag from the user query text."""
    if not query_text:
        return None
    q = _normalize_vietnamese(query_text)
    for keyword, tag in QUERY_TAG_MAP.items():
        norm_kw = _normalize_vietnamese(keyword)
        if norm_kw in q or q in norm_kw:
            return tag
    return None


class RetrievalService:
    def __init__(self, db: Session):
        self.db = db
        self._exact_match_res_ids = None
        self._dish_vector_res_ids = None
        self._tag_match_res_ids = {}

    def get_candidates(
        self,
        budget: int,
        query_vector: Optional[List[float]] = None,
        query_text: str = "",
        tag_name: Optional[str] = None,
        cleaned_query: str = "",
        viewport_bounds: Optional[dict] = None,
        map_center: Optional[List[float]] = None,
        map_radius_km: Optional[float] = None,
        user_allergies: Optional[List[str]] = None,
    ):
        """
        Retrieval từ Postgres với semantic ordering (relevance-first).

        Khi có query_vector:
          - Lọc bỏ restaurants chưa có embedding_vector.
          - ORDER BY embedding_vector <=> query_vector (Cosine Distance, thấp = gần nhất).
          - Dish-level search và exact match.
          - Tag-based hard filter và boost.
          - Negative keyword filtering.

        Khi không có query_vector:
          - Fallback ORDER BY rating_avg DESC.

        Không áp dụng bounding box theo khoảng cách — khoảng cách là metadata,
        việc lọc theo bán kính là tuỳ chọn phía Frontend.

        Returns:
            Danh sách RestaurantModel rows, tối đa _MAX_RETRIEVAL.
        """
        q_norm = _normalize_vietnamese(query_text)
        vegetarian_keywords = ["chay", "vegetarian", "vegan", "veggie", "do chay", "quan chay"]
        food_keywords = ["com", "ga", "bo", "pho", "bun", "banh", "hai san", "lau", "nuong", "cua", "ca", "mi", "mien", "banh canh", "banh mi", "banh xeo", "banh patty"]

        is_vegetarian_query = any(kw in q_norm for kw in vegetarian_keywords)
        is_food_query = any(q_norm in kw or kw in q_norm for kw in food_keywords)

        # Khởi tạo query cơ bản — không giới hạn bounding box
        query = self.db.query(RestaurantModel).filter(
            RestaurantModel.is_active == True
        )

        if user_allergies:
            from app.services.allergy_filter import apply_inline_allergy_filter
            query = apply_inline_allergy_filter(self.db, query, user_allergies)

        if viewport_bounds:
            query = self._apply_viewport_filter(query, viewport_bounds)
        elif map_center and map_radius_km:
            query = self._apply_radius_bounding_box(query, map_center, map_radius_km)

        # 2. Budget filter
        if budget and budget > 0:
            raw_min_price_str = case(
                (RestaurantModel.price_range.contains("-"), func.split_part(RestaurantModel.price_range, "-", 1)),
                else_=RestaurantModel.price_range,
            )
            raw_max_price_str = case(
                (RestaurantModel.price_range.contains("-"), func.split_part(RestaurantModel.price_range, "-", 2)),
                else_=RestaurantModel.price_range,
            )
            
            clean_min_price_str = func.regexp_replace(raw_min_price_str, r'\D', '', 'g')
            clean_max_price_str = func.regexp_replace(raw_max_price_str, r'\D', '', 'g')
            
            clean_min_price_int = func.coalesce(cast(func.nullif(clean_min_price_str, ''), Integer), 0)
            clean_max_price_int = func.coalesce(cast(func.nullif(clean_max_price_str, ''), Integer), 0)

            query = query.filter(
                or_(
                    and_(clean_min_price_int == 0, clean_max_price_int == 0),
                    clean_min_price_int <= budget,
                    clean_max_price_int <= budget,
                )
            )

        # 3. Negative keyword filtering
        if not is_vegetarian_query and is_food_query:
            query = query.filter(
                or_(
                    RestaurantModel.is_vegetarian == False,
                    RestaurantModel.is_vegetarian.is_(None)
                )
            )

        # 4. Tag-based hard filter
        # Ưu tiên tag_name truyền trực tiếp từ request, nếu không mới extract từ query_text
        food_tag = tag_name or extract_tag(query_text)
        tag_match_res_ids = []
        tag_filter_applied = False

        if food_tag:
            if food_tag in self._tag_match_res_ids:
                tag_match_res_ids = self._tag_match_res_ids[food_tag]
            else:
                from .models import TagModel, RestaurantTagModel
                tagged_res_ids = self.db.query(RestaurantTagModel.res_id).join(
                    TagModel, RestaurantTagModel.tag_id == TagModel.id
                ).filter(TagModel.name == food_tag).all()
                tag_match_res_ids = [str(r[0]) for r in tagged_res_ids]
                self._tag_match_res_ids[food_tag] = tag_match_res_ids
            
            if tag_match_res_ids:
                tag_query = query.filter(RestaurantModel.id.in_(tag_match_res_ids))
                count_after_tag = tag_query.count()
                
                if count_after_tag >= 3:
                    query = tag_query
                    tag_filter_applied = True
                else:
                    logger.warning(f"Tag filter for '{food_tag}' returned only {count_after_tag} results, falling back to boost mode.")

        # 5. Semantic ordering & retrieval
        if query_vector is not None:
            distance = RestaurantModel.embedding_vector.cosine_distance(query_vector).label("distance")
            main_query = query.add_columns(distance).filter(
                RestaurantModel.embedding_vector.isnot(None)
            ).order_by(distance)
            
            # Tier 1: Exact keyword matching trên DishModel (instance cached)
            if self._exact_match_res_ids is not None:
                exact_match_res_ids = self._exact_match_res_ids
            else:
                exact_match_res_ids = []
                search_term = cleaned_query if cleaned_query else query_text
                if search_term:
                    tokens = [t.strip() for t in search_term.split() if len(t.strip()) > 0]
                    if tokens:
                        filters = [DishModel.name.ilike(f"%{t}%") for t in tokens]
                        exact_dishes = self.db.query(DishModel.res_id).filter(
                            and_(*filters)
                        ).limit(200).all()
                        exact_match_res_ids = [str(r[0]) for r in exact_dishes]
                self._exact_match_res_ids = exact_match_res_ids
            
            # Tier 2: Vector search trên DishModel (instance cached)
            if self._dish_vector_res_ids is not None:
                dish_vector_res_ids = self._dish_vector_res_ids
            else:
                dish_vector_res_ids = []
                if query_vector is not None and len(query_vector) > 0:
                    dish_distance = DishModel.embedding_vector.cosine_distance(query_vector).label("dish_distance")
                    dish_matches = self.db.query(DishModel.res_id, dish_distance).filter(
                        DishModel.embedding_vector.isnot(None)
                    ).order_by(dish_distance).limit(30).all()
                    
                    for row in dish_matches:
                        if row[1] < 0.7:
                            dish_vector_res_ids.append(str(row[0]))
                self._dish_vector_res_ids = dish_vector_res_ids
            
            results = main_query.limit(_MAX_RETRIEVAL).all()
            candidates = []
            for row in results:
                model = row[0]
                dist = row[1]
                
                # Boost cho exact match dish
                if str(model.id) in exact_match_res_ids:
                    dist = max(0.0, dist - 0.25)
                # Boost cho dish vector match
                elif str(model.id) in dish_vector_res_ids:
                    dist = max(0.0, dist - 0.15)
                    
                model.distance = dist
                
                # Set tag_match flag for downstream ranking/features
                model.tag_match = str(model.id) in tag_match_res_ids
                
                # Boost thêm nếu quán này khớp tag (khi không áp dụng hard filter)
                if not tag_filter_applied and model.tag_match:
                    model.distance = max(0.0, model.distance - 0.3)

                candidates.append(model)
                
            candidates.sort(key=lambda x: x.distance)
            return self._filter_by_radius(candidates, map_center, map_radius_km)
        else:
            query = query.order_by(
                RestaurantModel.rating_avg.desc().nullslast()
            )
            candidates = query.limit(_MAX_RETRIEVAL).all()
            return self._filter_by_radius(candidates, map_center, map_radius_km)

    @staticmethod
    def _apply_viewport_filter(query, viewport_bounds: dict):
        try:
            north = float(viewport_bounds["north"])
            south = float(viewport_bounds["south"])
            east = float(viewport_bounds["east"])
            west = float(viewport_bounds["west"])
        except (KeyError, TypeError, ValueError):
            return query

        min_lat = min(south, north)
        max_lat = max(south, north)

        query = query.filter(
            RestaurantModel.lat.isnot(None),
            RestaurantModel.lng.isnot(None),
            RestaurantModel.lat.between(min_lat, max_lat),
        )

        if west <= east:
            return query.filter(RestaurantModel.lng.between(west, east))

        return query.filter(
            or_(
                RestaurantModel.lng >= west,
                RestaurantModel.lng <= east,
            )
        )

    @staticmethod
    def _apply_radius_bounding_box(query, map_center: List[float], radius_km: float):
        try:
            lat = float(map_center[0])
            lng = float(map_center[1])
            radius = float(radius_km)
        except (TypeError, ValueError, IndexError):
            return query

        lat_delta = radius / 111.0
        lng_delta = radius / max(111.0 * math.cos(math.radians(lat)), 1.0)

        return query.filter(
            RestaurantModel.lat.isnot(None),
            RestaurantModel.lng.isnot(None),
            RestaurantModel.lat.between(lat - lat_delta, lat + lat_delta),
            RestaurantModel.lng.between(lng - lng_delta, lng + lng_delta),
        )

    @staticmethod
    def _filter_by_radius(candidates, map_center: Optional[List[float]], radius_km: Optional[float]):
        if not map_center or not radius_km:
            return candidates

        try:
            center_lat = float(map_center[0])
            center_lng = float(map_center[1])
            radius = float(radius_km)
        except (TypeError, ValueError, IndexError):
            return candidates

        return [
            candidate for candidate in candidates
            if candidate.lat is not None
            and candidate.lng is not None
            and RetrievalService._haversine_km(center_lat, center_lng, float(candidate.lat), float(candidate.lng)) <= radius
        ]

    @staticmethod
    def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        radius = 6371.0
        p1, p2 = math.radians(lat1), math.radians(lat2)
        dp = math.radians(lat2 - lat1)
        dl = math.radians(lng2 - lng1)
        a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
        return radius * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
