import asyncio

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
        4. Filter strict bằng distance và budget
        5. Nếu 0 kết quả thì nới radius + budget
        6. Nếu vẫn 0 thì trả mock gần nhất để tránh UI trắng hoàn toàn
        """
        ai_response = await self.ai_client.extract_intent_and_vectorize(request.query)
        if not ai_response:
            raise HTTPException(status_code=503, detail="AI engine is currently unavailable.")

        # 1. Lọc dị ứng bằng recommendation pipeline
        recommend_results = recommend(
            query=request.query,
            user_id=request.user_id,
            db=db
        )
        safe_ids = recommend_results["results"]
        filtered_out_count = recommend_results["filtered_out_count"]
        warning = recommend_results.get("warning")

        # 2. Build danh sách kết quả (hiện tại dùng mock data)
        # TODO: Cần fetch data từ DB để trả về RecommendResult đầy đủ thay vì chỉ mock
        all_mock_results = self._build_mock_results()
        
        # Sort mock results based on the order of safe_ids (which are ranked by AI vector)
        safe_results = []
        for safe_id in safe_ids:
            for item in all_mock_results:
                if item.id == safe_id:
                    safe_results.append(item)
                    break

        strict_budget = request.budget if request.budget is not None else (ai_response.budget or self.DEFAULT_BUDGET_VND)

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
                warning=warning
            )

        relaxed_budget = strict_budget + self.FALLBACK_BUDGET_DELTA_VND
        relaxed_results = self._filter_results(
            results=safe_results,
            max_budget=relaxed_budget,
            max_radius_km=self.FALLBACK_RADIUS_KM,
        )

        if relaxed_results:
            reason = "No results with strict filters, backend relaxed radius and budget."
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

    # TODO: mock code 
    def _build_mock_results(self) -> list[RecommendResult]:
        return [
            RecommendResult(
                id=1,
                name="Mì Cay Sasin - Làng Đại Học",
                match="98%",
                dist="1.1 km",
                price="49k - 89k",
                rating="4.9",
                reason="Khớp hoàn hảo: Nằm ngay trục đường sầm uất của Làng Đại Học. Nước dùng chuẩn vị, không gian có máy lạnh.",
                img="/images/food1.jpg",
            ),
            RecommendResult(
                id=2,
                name="Mì Cay Seoul - Dĩ An",
                match="94%",
                dist="2.8 km",
                price="45k - 75k",
                rating="4.7",
                reason="Nằm hướng về trung tâm Dĩ An. Nước súp đậm đà cay nồng, sợi mì dai và trân châu đường đen đi kèm cực cuốn.",
                img="/images/food2.jpg",
            ),
            RecommendResult(
                id=3,
                name="Mì Cay Naga - Làng Đại Học",
                match="89%",
                dist="1.2 km",
                price="40k - 65k",
                rating="4.5",
                reason="Giải pháp tối ưu ngân sách cho sinh viên cuối tháng. Giá cả cực kỳ hạt dẻ nhưng topping hải sản vẫn rất đầy đặn.",
                img="/images/food3.jpg",
            ),
            RecommendResult(
                id=4,
                name="Yagami - Ẩm Thực Lẩu Thái-Nhật-Hàn",
                match="85%",
                dist="4.5 km",
                price="45k - 79k",
                rating="4.8",
                reason="Không gian check-in cực đẹp mang hơi hướng sang trọng, khuyên thử món mì cay bạch tuộc tươi giòn.",
                img="/images/food4.jpg",
            ),
            RecommendResult(
                id=5,
                name="Mì Cay Sasin Hoàng Diệu 2",
                match="82%",
                dist="5.2 km",
                price="40k - 65k",
                rating="4.6",
                reason="Tọa lạc trên con phố ẩm thực nhộn nhịp. Thích hợp cho những buổi tối cuối tuần muốn đi xa trường một chút.",
                img="/images/food5.jpg",
            ),
        ]

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

            if min_price <= max_budget and distance_km <= max_radius_km:
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
