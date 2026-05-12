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
    DEFAULT_BUDGET_VND = 50_000

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
        Pipeline recommend (relevance-first):
          1. Lấy query vector từ AI Engine.
          2. Gọi recommendation pipeline: semantic retrieval → allergy filter → LambdaMART rerank.
          3. Map kết quả thành RecommendResult (bao gồm distance_km).
          4. Trả toàn bộ kết quả theo thứ tự relevance — không filter theo khoảng cách.
             Việc lọc theo bán kính là tuỳ chọn phía Frontend.
        """
        ai_response = await self.ai_client.extract_intent_and_vectorize(request.query)
        if not ai_response:
            raise HTTPException(status_code=503, detail="AI engine is currently unavailable.")

        # Xác định budget: ưu tiên user request > default
        if request.budget is not None and request.budget > 0:
            effective_budget = request.budget
        else:
            effective_budget = self.DEFAULT_BUDGET_VND

        recommend_results = await recommend(
            query=request.query,
            user_id=request.user_id,
            db=db,
            query_vector=ai_response.vector,
            budget=effective_budget,
            user_location=[request.lat, request.lng],
            tag_name=request.tag_name,
        )

        raw_candidates = recommend_results["results"][:15]
        filtered_out_count = recommend_results["filtered_out_count"]
        warning = recommend_results.get("warning")

        # Tính min/max ranking_score để normalize về % (LambdaMART score là relative)
        scores = [
            m.ranking_score
            for m in raw_candidates
            if hasattr(m, "ranking_score") and m.ranking_score is not None
        ]
        max_score = max(scores) if scores else 0
        min_score = min(scores) if scores else 0
        score_range = max_score - min_score

        results: list[RecommendResult] = []
        for model in raw_candidates:
            if hasattr(model, "ranking_score") and model.ranking_score is not None:
                if score_range > 0:
                    normalized = (model.ranking_score - min_score) / score_range
                    match_pct = 70 + int(normalized * 28)
                else:
                    match_pct = 95
                match_str = f"{match_pct}%"
            elif hasattr(model, "distance") and model.distance is not None:
                match_pct = max(0, min(100, int((1.0 - model.distance) * 100)))
                if match_pct < 15:
                    # Loại bỏ kết quả có cosine similarity quá thấp (<15%)
                    continue
                match_str = f"{match_pct}%"
            else:
                match_str = "95%"

            results.append(
                self._map_to_recommend_result(
                    model=model,
                    user_lat=request.lat,
                    user_lng=request.lng,
                    match_str=match_str,
                )
            )

        logger.debug(
            "Search complete: query=%r, candidates=%d, mapped=%d, filtered_out=%d",
            request.query,
            len(raw_candidates),
            len(results),
            filtered_out_count,
        )

        return SearchRecommendResponse(
            results=results,
            fallback_applied=recommend_results.get("fallback_applied", False),
            fallback_reason=warning,
            applied_budget=effective_budget,
            filtered_out_count=filtered_out_count,
            warning=warning,
        )

    @staticmethod
    def _map_to_recommend_result(
        model,
        user_lat: float,
        user_lng: float,
        match_str: str = "95%",
    ) -> RecommendResult:
        import math

        lat2, lng2 = float(model.lat or 0), float(model.lng or 0)
        R = 6371.0
        p1, p2 = math.radians(user_lat), math.radians(lat2)
        dp = math.radians(lat2 - user_lat)
        dl = math.radians(lng2 - user_lng)
        a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
        dist_km = R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        price_str = model.price_range or ""
        if price_str:
            try:
                parts = price_str.split("-")
                formatted_parts = [
                    f"{int(p.strip()) // 1000}k"
                    for p in parts
                    if p.strip().isdigit()
                ]
                price_display = " - ".join(formatted_parts) or price_str
            except Exception:
                price_display = price_str
        else:
            price_display = "Liên hệ"

        return RecommendResult(
            id=str(model.id),
            name=model.name or "Không rõ tên",
            match=match_str,
            dist=f"{dist_km:.1f} km",
            distance_km=round(dist_km, 2),
            price=price_display,
            rating=str(model.rating_avg) if model.rating_avg else "Mới",
            reason="Phù hợp với tìm kiếm của bạn",
            img=model.image_url or "/images/default_food.jpg",
            google_maps_url=getattr(model, 'google_maps_url', None),
        )
