import asyncio

from fastapi import HTTPException

from .schemas import (
    AIResponseData,
    SearchRecommendRequest,
    SearchRecommendResponse,
    RecommendResult,
)
from app.services.ai_client import AIServiceClient


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

        return ai_response

    async def process_recommend_query(self, request: SearchRecommendRequest) -> SearchRecommendResponse:
        """
        Logic recommend có fallback:
        1. Gọi AI để lấy budget từ query
        2. Filter strict trước
        3. Nếu 0 kết quả thì nới radius + budget
        4. Nếu vẫn 0 thì trả mock gần nhất để tránh UI trắng hoàn toàn
        """
        ai_response = await self.ai_client.extract_intent_and_vectorize(request.query)
        if not ai_response:
            raise HTTPException(status_code=503, detail="AI engine is currently unavailable.")

        await asyncio.sleep(0.2)

        all_results = self._build_mock_results()
        strict_budget = ai_response.budget or self.DEFAULT_BUDGET_VND

        strict_results = self._filter_results(
            results=all_results,
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
            )

        relaxed_budget = strict_budget + self.FALLBACK_BUDGET_DELTA_VND
        relaxed_results = self._filter_results(
            results=all_results,
            max_budget=relaxed_budget,
            max_radius_km=self.FALLBACK_RADIUS_KM,
        )

        if relaxed_results:
            return SearchRecommendResponse(
                results=relaxed_results,
                fallback_applied=True,
                fallback_reason="No results with strict filters, backend relaxed radius and budget.",
                applied_radius_km=self.FALLBACK_RADIUS_KM,
                applied_budget=relaxed_budget,
            )

        nearest_results = sorted(
            all_results,
            key=self._extract_distance_km,
        )[:5]

        return SearchRecommendResponse(
            results=nearest_results,
            fallback_applied=True,
            fallback_reason="No results after relaxed filters, backend returned nearest restaurants as a safe fallback.",
            applied_radius_km=self.FALLBACK_RADIUS_KM,
            applied_budget=relaxed_budget,
        )

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
        raw = item.price.lower().replace("k", "").split("-")[0].strip()
        return int(raw) * 1000

    @staticmethod
    def _extract_distance_km(item: RecommendResult) -> float:
        raw = item.dist.lower().replace("km", "").strip()
        return float(raw)
