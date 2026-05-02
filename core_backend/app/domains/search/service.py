import asyncio
import logging

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from .schemas import (
    AIResponseData,
    SearchRecommendRequest,
    SearchRecommendResponse,
    RecommendResult,
)
from app.services.ai_client import AIServiceClient
from app.domains.ranking.ranking_service import RankingService
from app.domains.ranking.schemas import UserRankRequest
from app.services.user_services import get_user_allergies

logger = logging.getLogger(__name__)


class SearchService:
    DEFAULT_RADIUS_KM = 2.0
    FALLBACK_RADIUS_KM = 5.0
    DEFAULT_BUDGET_VND = 50_000
    FALLBACK_BUDGET_DELTA_VND = 30_000

    def __init__(self, ai_client: AIServiceClient):
        self.ai_client = ai_client

    async def process_search_query(self, query: str) -> AIResponseData:
        ai_response = await self.ai_client.extract_intent_and_vectorize(query)

        if not ai_response:
            raise HTTPException(status_code=503, detail="AI engine is currently unavailable.")

        # FUTURE IMPLEMENTATION: Database operations will be orchestrated here.
        # e.g., self.repository.search_restaurants(ai_response.vector)

        return ai_response

    async def process_recommend_query(
        self,
        request: SearchRecommendRequest,
        db: Session = None
    ) -> SearchRecommendResponse:
        """
        Logic recommend mới:
        1. Gọi AI Engine để lấy query_vector từ query người dùng
        2. Dùng RankingService + SemanticRetrievalService để search DB bằng pgvector
        3. Build RecommendResult từ restaurant thật trong DB
        4. Apply filter budget/radius và fallback
        """
        if db is None:
            raise HTTPException(status_code=500, detail="Database session is required.")

        ai_response = await self.ai_client.extract_intent_and_vectorize(request.query)
        if not ai_response:
            raise HTTPException(status_code=503, detail="AI engine is currently unavailable.")

        # 1. Ranking bằng semantic retrieval mới.
        # Fix task "dùng sai vector để tìm kiếm":
        # Dùng query_vector từ AI response để so khớp với embedding_vector trong DB.
        # Không gọi recommendation_service.recommend() cũ vì service đó dùng user_vector để cosine.
        ranking_service = RankingService()

        rank_budget = (
            request.budget
            if request.budget is not None and request.budget > 0
            else self.DEFAULT_BUDGET_VND
        )

        rank_request = UserRankRequest(
            user_id=request.user_id or "anonymous",
            query_vector=ai_response.vector,
            user_location=[
                request.lat,
                request.lng,
            ],
            k=5,
            offset=0,
            tags=[],
            budget=rank_budget,
            radius=self.FALLBACK_RADIUS_KM,
        )

        safe_ids = await ranking_service.get_recommendations(db, rank_request)

        filtered_out_count = 0
        warning = None

        user_allergies = []

        if request.user_id:
            try:
                user_allergies = get_user_allergies(db, request.user_id)
            except Exception as exc:
                logger.warning(
                    "Could not load user allergies for user_id=%s: %s",
                    request.user_id,
                    exc,
                )
                db.rollback()
                user_allergies = []

        # 2. Build danh sách kết quả từ DB thật theo ranked_ids.
        # Ranking mới trả UUID thật của restaurants, không còn dùng mock id 1,2,3 nữa.
        safe_results = self._build_results_from_db(
            db=db,
            ranked_ids=safe_ids,
            user_lat=request.lat,
            user_lng=request.lng,
        )

        if user_allergies:
            safe_results, filtered_out_count = self._filter_results_by_allergies(
                db=db,
                results=safe_results,
                user_allergies=user_allergies,
            )

            if filtered_out_count > 0:
                warning = (
                    f"{filtered_out_count} result(s) were removed because their dishes "
                    "may contain allergens from the user's allergy profile."
                )

        if request.budget is not None:
            # budget=0 is treated as "unlimited" (None)
            strict_budget = request.budget if request.budget > 0 else None
            logger.debug(
                "Budget source: user body (%s VND)",
                strict_budget if strict_budget is not None else "unlimited",
            )
        elif ai_response.budget:
            strict_budget = ai_response.budget
            logger.debug("Budget source: AI extraction (%d VND)", strict_budget)
        else:
            strict_budget = self.DEFAULT_BUDGET_VND
            logger.debug("Budget source: default (%d VND)", strict_budget)

        strict_results = self._filter_results(
            results=safe_results,
            max_budget=strict_budget,
            max_radius_km=self.DEFAULT_RADIUS_KM,
        )

        if strict_results:
            return SearchRecommendResponse(
                results=strict_results,
                fallback_applied=False,
                fallback_reason=None,
                applied_radius_km=self.DEFAULT_RADIUS_KM,
                applied_budget=strict_budget,
                filtered_out_count=filtered_out_count,
                warning=warning,
            )

        relaxed_budget = (
            strict_budget + self.FALLBACK_BUDGET_DELTA_VND
            if strict_budget is not None
            else None
        )

        relaxed_results = self._filter_results(
            results=safe_results,
            max_budget=relaxed_budget,
            max_radius_km=self.FALLBACK_RADIUS_KM,
        )

        if relaxed_results:
            reason = "No results with strict filters, backend relaxed radius and budget."
            if warning:
                reason = warning + ". " + reason

            return SearchRecommendResponse(
                results=relaxed_results,
                fallback_applied=True,
                fallback_reason=reason,
                applied_radius_km=self.FALLBACK_RADIUS_KM,
                applied_budget=relaxed_budget,
                filtered_out_count=filtered_out_count,
                warning=warning,
            )

        nearest_results = sorted(
            safe_results,
            key=self._extract_distance_km,
        )[:5]

        reason = "No results after relaxed filters, backend returned nearest restaurants as a safe fallback."
        if warning:
            reason = warning + ". " + reason

        return SearchRecommendResponse(
            results=nearest_results,
            fallback_applied=True,
            fallback_reason=reason,
            applied_radius_km=self.FALLBACK_RADIUS_KM,
            applied_budget=None,
            filtered_out_count=filtered_out_count,
            warning=warning,
        )

    def _build_results_from_db(
        self,
        db: Session,
        ranked_ids: list[str],
        user_lat: float,
        user_lng: float,
    ) -> list[RecommendResult]:
        """
        Build RecommendResult từ restaurant thật trong DB theo thứ tự ranked_ids.
        Dùng raw SQL để tránh lệch model SQLAlchemy với DB thật.
        """
        if not ranked_ids:
            return []

        placeholders = []
        params = {}

        for index, res_id in enumerate(ranked_ids):
            key = f"id_{index}"
            placeholders.append(f":{key}")
            params[key] = str(res_id)

        sql = text(f"""
            SELECT
                id,
                name,
                lat,
                lng,
                price_range,
                rating_avg,
                image_url
            FROM public.restaurants
            WHERE id IN ({", ".join(placeholders)})
        """)

        rows = db.execute(sql, params).mappings().all()
        restaurant_map = {str(row["id"]): dict(row) for row in rows}

        results = []

        for res_id in ranked_ids:
            r = restaurant_map.get(str(res_id))
            if not r:
                continue

            distance_km = self._haversine_km(
                user_lat,
                user_lng,
                float(r.get("lat") or 0),
                float(r.get("lng") or 0),
            )

            results.append(
                RecommendResult(
                    id=str(r.get("id")),
                    name=r.get("name") or "Unknown restaurant",
                    match="95%",
                    dist=f"{distance_km:.1f} km",
                    price=r.get("price_range") or "Không rõ",
                    rating=str(r.get("rating_avg") or 0),
                    reason="Được đề xuất vì nội dung tìm kiếm khớp ngữ nghĩa với embedding của nhà hàng.",
                    img=r.get("image_url") or "",
                )
            )

        return results

    def _filter_results_by_allergies(
        self,
        db: Session,
        results: list[RecommendResult],
        user_allergies: list[str],
    ) -> tuple[list[RecommendResult], int]:
        """
        Lọc restaurant theo dị ứng của user dựa trên dishes.allergens.

        Vì allergens nằm ở bảng dishes, ta kiểm tra tất cả dish thuộc restaurant.
        Nếu restaurant có ít nhất 1 dish chứa allergen trùng với user_allergies,
        restaurant đó sẽ bị loại khỏi kết quả recommend.
        """
        if not results or not user_allergies:
            return results, 0

        restaurant_ids = [str(item.id) for item in results]

        placeholders = []
        params = {}

        for index, res_id in enumerate(restaurant_ids):
            key = f"res_id_{index}"
            placeholders.append(f":{key}")
            params[key] = res_id

        sql = text(f"""
            SELECT
                res_id,
                allergens
            FROM public.dishes
            WHERE res_id IN ({", ".join(placeholders)})
            AND allergens IS NOT NULL
        """)

        rows = db.execute(sql, params).mappings().all()

        allergy_set = {
            str(allergy).lower().strip()
            for allergy in user_allergies
            if allergy and str(allergy).strip()
        }

        unsafe_restaurant_ids = set()

        for row in rows:
            res_id = str(row["res_id"])
            allergens = row.get("allergens") or []

            if isinstance(allergens, str):
                allergens = [allergens]

            dish_allergen_set = {
                str(allergen).lower().strip()
                for allergen in allergens
                if allergen and str(allergen).strip()
            }

            if allergy_set.intersection(dish_allergen_set):
                unsafe_restaurant_ids.add(res_id)

        safe_results = [
            item for item in results
            if str(item.id) not in unsafe_restaurant_ids
        ]

        filtered_out_count = len(results) - len(safe_results)

        return safe_results, filtered_out_count

    def _haversine_km(
        self,
        lat1: float,
        lng1: float,
        lat2: float,
        lng2: float,
    ) -> float:
        import math

        radius_km = 6371.0

        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)

        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(dlng / 2) ** 2
        )

        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return radius_km * c


    def _filter_results(
        self,
        results: list[RecommendResult],
        max_budget: int,
        max_radius_km: float,
    ) -> list[RecommendResult]:
        filtered = []
        for item in results:
            min_price = self._extract_min_price(item)
            distance_km = self._extract_distance_km(item)

            if (max_budget is None or min_price <= max_budget) and distance_km <= max_radius_km:
                filtered.append(item)

        return filtered

    @staticmethod
    def _extract_min_price(item: RecommendResult) -> int:
        try:
            price_text = str(item.price or "").lower().strip()

            if not price_text or price_text == "không rõ":
                return 0

            # Ví dụ: "49k - 89k"
            if "k" in price_text:
                raw = price_text.replace("k", "").split("-")[0].strip()
                return int(float(raw)) * 1000

            # Ví dụ: "50000-100000"
            if "-" in price_text:
                raw = price_text.split("-")[0].strip()
                return int(float(raw))

            # Ví dụ: "50000"
            return int(float(price_text))

        except (ValueError, IndexError, AttributeError):
            return 999_999_999
    
    @staticmethod
    def _extract_distance_km(item: RecommendResult) -> float:
        try:
            # Expected format: "1.1 km"
            raw = str(item.dist or "").lower().replace("km", "").strip()
            return float(raw)
        except (ValueError, AttributeError):
            # Fallback to a very large distance
            return 9999.0