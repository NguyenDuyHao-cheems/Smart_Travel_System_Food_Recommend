import asyncio
import logging

from fastapi import HTTPException
from sqlalchemy.orm import Session

from .schemas import (
    AIResponseData,
    SearchRecommendRequest,
    SearchRecommendResponse,
    RecommendResult,
)
from app.services.ai_client import AIServiceClient
from app.services.recommendation_service import recommend

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

    async def process_recommend_query(self, request: SearchRecommendRequest, db: Session = None) -> SearchRecommendResponse:
        """
        Logic recommend có fallback kết hợp allergy filter:
        1. Gọi recommendation service pipeline để filter dị ứng
        2. Gọi AI để lấy budget từ query
        3. Map kết quả filter thành mock objects (hoặc query DB)
        4. Filter strict bằng distance; budget được đẩy xuống DB retrieval
        5. Nếu 0 kết quả thì nới radius
        6. Nếu vẫn 0 thì trả mock gần nhất để tránh UI trắng hoàn toàn
        """
        ai_response = await self.ai_client.extract_intent_and_vectorize(request.query)
        if not ai_response:
            raise HTTPException(status_code=503, detail="AI engine is currently unavailable.")

        # 1. Lọc dị ứng + semantic retrieval bằng recommendation pipeline
        # Xác định budget: ưu tiên user request > AI extraction > default
        if request.budget is not None and request.budget > 0:
            effective_budget = request.budget
        elif ai_response.budget:
            effective_budget = ai_response.budget
        else:
            effective_budget = self.DEFAULT_BUDGET_VND

        recommend_results = recommend(
            query=request.query,
            user_id=request.user_id,
            db=db,
            query_vector=ai_response.vector,
            tags=ai_response.tags, # Passed down to retrieval for hard filtering
            budget=effective_budget,
            user_location=[request.lat, request.lng],
            radius=self.DEFAULT_RADIUS_KM,
        )
        safe_candidates = recommend_results["results"]
        filtered_out_count = recommend_results["filtered_out_count"]
        warning = recommend_results.get("warning")

        # Build danh sách kết quả trực tiếp từ DB models (giới hạn 15 kết quả cho UI)
        safe_candidates = recommend_results["results"][:15]
        safe_results = []
        for model in safe_candidates:
            if hasattr(model, 'distance') and model.distance is not None:
                # cosine_distance is usually 0.0 for exact match, up to 2.0.
                # We map distance to match percentage
                match_pct = max(0, min(100, int((1.0 - model.distance) * 100)))
                if match_pct < 15:
                    # Ngưỡng tối thiểu: Nếu vector distance quá xa (<15% match), bỏ qua kết quả này
                    # Nếu tất cả kết quả đều bị bỏ qua, hệ thống sẽ tự động nhảy vào geographical fallback
                    continue
                match_str = f"{match_pct}%"
            else:
                match_str = "95%"

            result = self._map_to_recommend_result(
                model=model,
                user_lat=request.lat,
                user_lng=request.lng,
                intent=ai_response.intent,
                match_str=match_str
            )
            safe_results.append(result)

        if request.budget is not None:
            # budget=0 is treated as "unlimited" (None)
            strict_budget = request.budget if request.budget > 0 else None
            logger.debug("Budget source: user body (%s VND)", strict_budget if strict_budget is not None else "unlimited")
        elif ai_response.budget:
            strict_budget = ai_response.budget
            logger.debug("Budget source: AI extraction (%d VND)", strict_budget)
        else:
            strict_budget = self.DEFAULT_BUDGET_VND
            logger.debug("Budget source: default (%d VND)", strict_budget)

        strict_results = self._filter_results(
            results=safe_results,
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
                warning=warning
            )

        relaxed_budget = (strict_budget + self.FALLBACK_BUDGET_DELTA_VND) if strict_budget is not None else None
        relaxed_results = self._filter_results(
            results=safe_results,
            max_radius_km=self.FALLBACK_RADIUS_KM,
        )

        if relaxed_results:
            reason = "No results with strict filters, backend relaxed radius."
            if warning: reason = warning + ". " + reason
            return SearchRecommendResponse(
                results=relaxed_results,
                fallback_applied=True,
                fallback_reason=reason,
                applied_radius_km=self.FALLBACK_RADIUS_KM,
                applied_budget=relaxed_budget,
                filtered_out_count=filtered_out_count,
                warning=warning
            )

        if not strict_results and not relaxed_results:
            # Fallback thực sự: Lấy nhà hàng gần nhất (không dùng vector query)
            fallback_recommend = recommend(
                query=request.query,
                user_id=request.user_id,
                db=db,
                query_vector=None, # Disable semantic
                budget=effective_budget,
                user_location=[request.lat, request.lng],
                radius=self.FALLBACK_RADIUS_KM,
            )
            fallback_candidates = fallback_recommend["results"][:5]
            nearest_results = []
            for model in fallback_candidates:
                nearest_results.append(
                    self._map_to_recommend_result(
                        model=model,
                        user_lat=request.lat,
                        user_lng=request.lng,
                        intent=ai_response.intent,
                        match_str="Gợi ý gần đây"
                    )
                )
        else:
            nearest_results = sorted(
                safe_results,
                key=self._extract_distance_km,
            )[:5]

        reason = "No results after relaxed filters, backend returned nearest restaurants as a safe fallback."
        if warning: reason = warning + ". " + reason

        return SearchRecommendResponse(
            results=nearest_results,
            fallback_applied=True,
            fallback_reason=reason,
            applied_radius_km=self.FALLBACK_RADIUS_KM,
            applied_budget=None,
            filtered_out_count=filtered_out_count,
            warning=warning
        )

    @staticmethod
    def _map_to_recommend_result(model, user_lat: float, user_lng: float, intent: str = None, match_str: str = "95%") -> RecommendResult:
        import math
        lat1, lng1 = user_lat, user_lng
        lat2, lng2 = float(model.lat or 0), float(model.lng or 0)
        R = 6371.0
        p1, p2 = math.radians(lat1), math.radians(lat2)
        dp = math.radians(lat2 - lat1)
        dl = math.radians(lng2 - lng1)
        a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
        dist_km = R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        price_str = model.price_range or ""
        if price_str:
            try:
                parts = price_str.split("-")
                formatted_parts = [f"{int(p.strip())//1000}k" for p in parts if p.strip().isdigit()]
                price_display = " - ".join(formatted_parts)
                if not price_display:
                    price_display = price_str
            except Exception:
                price_display = price_str
        else:
            price_display = "Liên hệ"

        return RecommendResult(
            id=str(model.id),
            name=model.name or "Không rõ tên",
            match=match_str,
            dist=f"{dist_km:.1f} km",
            price=price_display,
            rating=str(model.rating_avg) if model.rating_avg else "Mới",
            reason=intent or "Phù hợp với tìm kiếm của bạn",
            img=model.image_url or "/images/default_food.jpg"
        )

    def _filter_results(
        self,
        results: list[RecommendResult],
        max_radius_km: float,
    ) -> list[RecommendResult]:
        filtered = []
        for item in results:
            distance_km = self._extract_distance_km(item)

            if distance_km <= max_radius_km:
                filtered.append(item)

        return filtered

    @staticmethod
    def _extract_min_price(item: RecommendResult) -> int:
        try:
            # Expected format: "49k - 89k"
            raw = item.price.lower().replace("k", "").split("-")[0].strip()
            return int(raw) * 1000
        except (ValueError, IndexError, AttributeError):
            # Fallback to a very high price so it gets filtered out if invalid
            return 999_999_999

    @staticmethod
    def _extract_distance_km(item: RecommendResult) -> float:
        try:
            # Expected format: "1.1 km"
            raw = item.dist.lower().replace("km", "").strip()
            return float(raw)
        except (ValueError, AttributeError):
            # Fallback to a very large distance
            return 9999.0
