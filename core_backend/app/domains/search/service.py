import logging
import uuid as _uuid
import shortuuid


from fastapi import HTTPException
from sqlalchemy.orm import Session

from .schemas import (
    AIResponseData,
    SearchRecommendRequest,
    SearchRecommendResponse,
    SessionCreateResponse,
    SessionDataResponse,
    RecommendResult,
)
from app.services.ai_client import AIServiceClient
from app.services.recommendation_service import recommend
from app.services.review_sentiment import (
    normalize_restaurant_sentiment,
    sentiment_label_for_score,
)

logger = logging.getLogger(__name__)


class SearchService:
    DEFAULT_BUDGET_VND = 50_000

    def __init__(self, ai_client: AIServiceClient):
        self.ai_client = ai_client

    async def process_search_query(self, query: str) -> AIResponseData:
        ai_response = await self.ai_client.extract_intent_and_vectorize(query)
        if not ai_response:
            raise HTTPException(status_code=503, detail="AI engine is currently unavailable.")
        return ai_response

    async def process_recommend_query(
        self,
        request: SearchRecommendRequest,
        db: Session,
    ) -> SessionCreateResponse:
        """
        Pipeline recommend:
          1. Vectorize query qua AI Engine.
          2. Gọi recommendation pipeline.
          3. Map kết quả thành RecommendResult.
          4. Lưu session vào DB (query, lat, lng, budget, results_json).
          5. Trả về SessionCreateResponse: session_id + results.
        """
        ai_response = await self.ai_client.extract_intent_and_vectorize(request.query)
        if not ai_response:
            raise HTTPException(status_code=503, detail="AI engine is currently unavailable.")

        effective_budget = (
            request.budget if request.budget and request.budget > 0
            else self.DEFAULT_BUDGET_VND
        )

        recommend_results = await recommend(
            query=request.query,
            user_id=request.user_id,
            db=db,
            query_vector=ai_response.vector,
            budget=effective_budget,
            user_location=[request.lat, request.lng],
            tag_name=request.tag_name,
            cleaned_query=ai_response.cleaned_query,
            search_mode=request.search_mode or "basic",
        )

        top_k = getattr(request, "top_k", 24) or 24
        raw_candidates = recommend_results["results"][:top_k]
        filtered_out_count = recommend_results.get("filtered_out_count", 0)
        allergen_flagged_count = recommend_results.get("allergen_flagged_count", 0)
        warning = recommend_results.get("warning")
        fallback_reason = recommend_results.get("fallback_reason")

        scores = [
            m.ranking_score for m in raw_candidates
            if hasattr(m, "ranking_score") and m.ranking_score is not None
        ]
        max_score = max(scores) if scores else 0
        min_score = min(scores) if scores else 0
        score_range = max_score - min_score

        results: list[RecommendResult] = []
        for model in raw_candidates:
            if hasattr(model, "ranking_score") and model.ranking_score is not None:
                match_pct = 70 + int(((model.ranking_score - min_score) / score_range) * 28) if score_range > 0 else 95
                match_str = f"{match_pct}%"
            elif hasattr(model, "distance") and model.distance is not None:
                similarity = 1.0 - model.distance
                match_pct = max(0, min(100, int((similarity + 1.0) / 2.0 * 100)))
                if match_pct < 57:
                    continue
                match_str = f"{match_pct}%"
            else:
                match_str = "95%"

            req_tags = request.tag_name or ai_response.cleaned_query

            results.append(
                self._map_to_recommend_result(model, request.lat, request.lng, match_str, request_tags=req_tags)
            )

        logger.debug("Search: query=%r, mapped=%d, filtered_out=%d", request.query, len(results), filtered_out_count)

        # ── Lưu session vào DB ──────────────────────────────────────────────
        from .models import SearchSession

        user_uuid = None
        if request.user_id:
            try:
                user_uuid = _uuid.UUID(request.user_id)
            except ValueError:
                pass

        # Đóng gói toàn bộ thông tin để lưu vào JSONB (snapshot hoàn chỉnh)
        full_session_data = {
            "results": [r.model_dump() for r in results],
            "fallback_applied": recommend_results.get("fallback_applied", False),
            "fallback_reason": fallback_reason,
            "applied_budget": effective_budget,
            "filtered_out_count": filtered_out_count,
            "allergen_flagged_count": allergen_flagged_count,
            "warning": warning
        }

        session_obj = SearchSession(
            user_id=user_uuid,
            query=request.query,
            lat=request.lat,
            lng=request.lng,
            budget=effective_budget,
            results_json=full_session_data,
        )
        db.add(session_obj)
        db.commit()
        db.refresh(session_obj)
        logger.info("Saved search session: id=%s", session_obj.id)

        return SessionCreateResponse(
            session_id=shortuuid.encode(session_obj.id),
            results=results,

            fallback_applied=recommend_results.get("fallback_applied", False),
            fallback_reason=fallback_reason,
            applied_budget=effective_budget,
            filtered_out_count=filtered_out_count,
            allergen_flagged_count=allergen_flagged_count,
            warning=warning,
        )

    @staticmethod
    def get_session(session_id: str, db: Session) -> SessionDataResponse:
        """Truy vấn DB theo session_id (hỗ trợ cả short ID và raw UUID), trả về SessionDataResponse hoặc 404."""
        from .models import SearchSession

        uid = None
        # Thử giải mã nếu là shortuuid
        try:
            if len(session_id) < 36:  # Short IDs are usually 22 chars
                uid = shortuuid.decode(session_id)
            else:
                uid = _uuid.UUID(session_id)
        except Exception:
            # Nếu không giải mã được, thử xem có phải UUID trực tiếp không
            try:
                uid = _uuid.UUID(session_id)
            except ValueError:
                raise HTTPException(status_code=422, detail="session_id không hợp lệ.")


        obj = db.query(SearchSession).filter(SearchSession.id == uid).first()
        if not obj:
            raise HTTPException(status_code=404, detail="Không tìm thấy phiên tìm kiếm.")

        data = obj.results_json or {}
        # Nếu data là list (kiểu cũ), ta bọc lại thành dict
        if isinstance(data, list):
            data = {"results": data}

        results = [RecommendResult(**r) for r in data.get("results", [])]
        
        return SessionDataResponse(
            session_id=shortuuid.encode(obj.id),
            query=obj.query,

            results=results,
            fallback_applied=data.get("fallback_applied", False),
            fallback_reason=data.get("fallback_reason"),
            applied_budget=data.get("applied_budget"),
            filtered_out_count=data.get("filtered_out_count", 0),
            allergen_flagged_count=data.get("allergen_flagged_count", 0),
            warning=data.get("warning"),
            created_at=obj.created_at,
        )

    @staticmethod
    def _map_to_recommend_result(model, user_lat: float, user_lng: float, match_str: str = "95%", request_tags: str = None) -> RecommendResult:
        import math

        lat2, lng2 = float(model.lat or 0), float(model.lng or 0)
        R = 6371.0
        p1, p2 = math.radians(user_lat), math.radians(lat2)
        dp, dl = math.radians(lat2 - user_lat), math.radians(lng2 - user_lng)
        a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
        dist_km = R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        price_str = model.price_range or ""
        if price_str:
            try:
                parts = price_str.split("-")
                formatted = [f"{int(p.strip()) // 1000}k" for p in parts if p.strip().isdigit()]
                price_display = " - ".join(formatted) or price_str
            except Exception:
                price_display = price_str
        else:
            price_display = "Liên hệ"

        rating_display = str(model.rating_avg) if model.rating_avg else "Mới"
        if getattr(model, 'total_reviews', 0) in (0, None):
            rating_display = "Chưa có đánh giá"

        return RecommendResult(
            id=shortuuid.encode(model.id),
            name=model.name or "Không rõ tên",
            match=match_str,
            dist=f"{dist_km:.1f} km",
            distance_km=round(dist_km, 2),
            lat=float(model.lat) if model.lat is not None else None,
            lng=float(model.lng) if model.lng is not None else None,
            price=price_display,
            rating=rating_display,
            reason=SearchService._generate_dynamic_reason(model, dist_km, request_tags),
            img=model.image_url or "/images/default_food.jpg",
            total_reviews=getattr(model, "total_reviews", 0) or 0,
            google_maps_url=getattr(model, "google_maps_url", None),
            allergen_warning=getattr(model, "allergen_warning", None),
            is_vegetarian=getattr(model, "is_vegetarian", False) or False,
            sentiment_score=normalize_restaurant_sentiment(getattr(model, "sentiment_score", None)),
            sentiment_label=sentiment_label_for_score(getattr(model, "sentiment_score", None)),
            sentiment_review_count=getattr(model, "total_reviews", 0) or 0,
        )

    @staticmethod
    def _generate_dynamic_reason(model, dist_km: float, request_tags: str = None) -> str:
        reasons = []
        
        # 1. Yếu tố món ăn (nếu có match tag)
        if request_tags and hasattr(model, 'tags') and model.tags:
            tag_names = [t.name.lower() for t in model.tags if hasattr(t, 'name') and t.name]
            req_tag_lower = request_tags.lower()
            # Ưu tiên lấy tag ngắn gọn hiển thị thay vì hiện cả chuỗi query dài
            matched_tags = []
            for tn in tag_names:
                if req_tag_lower in tn or tn in req_tag_lower:
                    matched_tags.append(tn.title())
            if matched_tags:
                reasons.append(f"Có món {matched_tags[0]}")

        # 2. Yếu tố khoảng cách
        if dist_km < 1.5:
            reasons.append("Rất gần bạn")
            
        # 3. Yếu tố đánh giá
        if hasattr(model, 'rating_avg') and model.rating_avg and model.rating_avg >= 4.5:
            # Chỉ coi là "Đánh giá cao" nếu thực sự có review, tránh case default 5.0
            if getattr(model, 'total_reviews', 0) > 0:
                reasons.append("Đánh giá cao")

        sentiment = normalize_restaurant_sentiment(getattr(model, "sentiment_score", None))
        if sentiment >= 0.35 and getattr(model, "total_reviews", 0) > 0:
            reasons.append("Review tích cực")
            
        if reasons:
            return " · ".join(reasons)
        return "Phù hợp với tìm kiếm của bạn"

    @staticmethod
    def get_lucky_wheel_dishes(
        db: Session,
        lat: float | None = None,
        lng: float | None = None,
        user_id: str | None = None,
        limit: int = 12
    ) -> list[str]:
        from sqlalchemy import desc
        from app.domains.ranking.models import DishModel, RestaurantModel
        from app.domains.users.models import UserOnboarding

        # Predefined default/popular dishes
        DEFAULT_DISHES = [
            "Phở Bò", "Bún Chả", "Bánh Mì", "Cơm Tấm", "Bún Đậu Mắm Tôm",
            "Bún Bò Huế", "Mì Quảng", "Hủ Tiếu", "Bánh Xèo", "Gà Nướng",
            "Lẩu Thái", "Nem Nướng"
        ]

        DEFAULT_VEGETARIAN_DISHES = [
            "Phở Chay", "Bún Chả Chay", "Bánh Mì Chay", "Cơm Tấm Chay",
            "Đậu Hũ Lướt Ván", "Lẩu Nấm Chay", "Mì Quảng Chay", "Hủ Tiếu Chay",
            "Bánh Xèo Chay", "Nấm Kho Tộ", "Gỏi Cuốn Chay", "Bún Bò Huế Chay"
        ]

        is_vegetarian = False
        if user_id:
            try:
                onboarding = db.query(UserOnboarding).filter(UserOnboarding.user_id == user_id).first()
                if onboarding:
                    is_vegetarian = getattr(onboarding, "is_vegetarian", False) or False
            except Exception as e:
                logger.error(f"Error checking vegetarian status for lucky wheel: {e}")

        fallback_list = DEFAULT_VEGETARIAN_DISHES if is_vegetarian else DEFAULT_DISHES

        def is_valid_lucky_dish(dish_name: str) -> bool:
            name_lower = dish_name.lower()
            
            # Exact words/phrases to exclude
            exclude_exact = {
                "pepsi", "coca", "coca-cola", "cocacola", "sprite", "7up", "sevenup", "sting", "revive", "mirinda", "fanta", "soda", "milo",
                "aquafina", "dasani", "lavie", "vĩnh hảo", "nước suối", "nước khoáng", "trà đá", "trà nóng", "khăn lạnh", "khăn ướt", "khăn giấy",
                "khăn", "đá", "ly đá", "đá chén", "chén đá", "tẩy đá", "bột ớt", "tương ớt", "bánh mì không", "cơm không", "thêm", "topping", 
                "bia", "heineken", "tiger", "redbull", "bò húc", "red bull", "trà ô long", "trà oolong", "đá lau", "hộp mang về", "măng chua thêm",
                "trà chanh", "trà tắc", "trà đào", "chanh muối", "phindi", "sinh tố", "nước ép", "nước dừa", "sữa tươi"
            }
            if name_lower in exclude_exact:
                return False
                
            # Substrings that indicate drinks, extras, or non-food items
            exclude_subs = [
                "pepsi", "coca-cola", "cocacola", "aquafina", "dasani", "lavie", "nước suối", "trà đá", 
                "khăn lạnh", "khăn ướt", "khăn giấy", "hộp mang về", "ly đá", "tẩy đá", "bún thêm", 
                "phở thêm", "mì thêm", "cơm thêm", "thịt thêm", "chả thêm", "trứng thêm", "gà thêm", "rau thêm",
                "bánh tráng thêm", "bánh mì thêm", "trà tắc", "trà chanh", "nước ngọt", "chén đá",
                "phindi", "cà phê", "cafe", "coffee", "trà sữa", "sinh tố", "nước ép", "nước dừa", "sữa tươi"
            ]
            for sub in exclude_subs:
                if sub in name_lower:
                    return False
                    
            # Check for simple beverages/alcohol
            if name_lower.startswith("bia ") or " bia " in name_lower or name_lower.endswith(" bia"):
                return False
                
            # Exclude names containing words like "thêm", "topping" at the end
            words = name_lower.split()
            if not words:
                return False
            if words[-1] in {"thêm", "topping", "extra", "lon", "chai"}:
                return False
                
            # Exclude simple soft drinks with volume/brand as first word
            soft_drink_brands = {
                "pepsi", "coca", "7up", "sevenup", "sting", "mirinda", "fanta", "sprite", "redbull", "tiger", "heineken",
                "cafe", "coffee", "phindi", "matcha"
            }
            if words[0] in soft_drink_brands:
                return False

            return True

        if lat is None or lng is None:
            return fallback_list

        try:
            # Query dishes near location (15km bounding box)
            lat_range = 0.135
            lng_range = 0.135

            query = (
                db.query(DishModel.name, DishModel.res_id)
                .join(RestaurantModel, DishModel.res_id == RestaurantModel.id)
                .filter(
                    RestaurantModel.lat.between(lat - lat_range, lat + lat_range),
                    RestaurantModel.lng.between(lng - lng_range, lng + lng_range),
                    RestaurantModel.is_active == True
                )
            )

            if is_vegetarian:
                query = query.filter(DishModel.is_vegetarian == True)

            candidates = (
                query.order_by(desc(RestaurantModel.rating_avg))
                .limit(300)
                .all()
            )
        except Exception as e:
            logger.error(f"Error querying dynamic dishes: {e}")
            candidates = []

        if not candidates:
            return fallback_list

        seen = set()
        dishes = []
        restaurant_dish_count = {}

        # Pass 1: At most 1 dish per restaurant to ensure high diversity
        for name, res_id in candidates:
            clean_name = name.strip()
            if len(clean_name) <= 3 or len(clean_name) >= 25:
                continue

            if not is_valid_lucky_dish(clean_name):
                continue

            dup_key = clean_name.lower()
            if dup_key in seen:
                continue

            # Limit to 1 dish per restaurant initially
            if restaurant_dish_count.get(res_id, 0) >= 1:
                continue

            seen.add(dup_key)
            dishes.append(clean_name)
            restaurant_dish_count[res_id] = 1
            if len(dishes) >= limit:
                break

        # Pass 2: If we need more dishes, allow multiple from the same restaurants
        if len(dishes) < limit:
            for name, res_id in candidates:
                clean_name = name.strip()
                if len(clean_name) <= 3 or len(clean_name) >= 25:
                    continue

                if not is_valid_lucky_dish(clean_name):
                    continue

                dup_key = clean_name.lower()
                if dup_key in seen:
                    continue

                seen.add(dup_key)
                dishes.append(clean_name)
                restaurant_dish_count[res_id] = restaurant_dish_count.get(res_id, 0) + 1
                if len(dishes) >= limit:
                    break

        # Pass 3: Fill the rest using fallback list
        if len(dishes) < limit:
            for d in fallback_list:
                if d.lower() not in seen:
                    dishes.append(d)
                    seen.add(d.lower())
                    if len(dishes) >= limit:
                        break

        return dishes

