import re
from typing import Optional
import torch
from transformers import AutoTokenizer, AutoModel
from fastapi import HTTPException
from .schemas import (
    AIResponseData,
    SearchRecommendRequest,
    SearchRecommendResponse,
    RecommendResult,
    ExtractIntentRequest,
    ExtractIntentResponse,
)
from app.services.ai_client import AIServiceClient
MODEL_NAME = "vinai/phobert-base"

# Load PhoBERT một lần khi module được import
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModel.from_pretrained(MODEL_NAME)
model.eval()
class SearchService:
    def __init__(self, ai_client: AIServiceClient):
        self.ai_client = ai_client
        
    async def process_search_query(self, query: str) -> AIResponseData:
        ai_response = await self.ai_client.extract_intent_and_vectorize(query)
        
        if not ai_response:
            raise HTTPException(status_code=503, detail="AI engine is currently unavailable.")
            
        # FUTURE IMPLEMENTATION: Database operations will be orchestrated here.
        # e.g., self.repository.search_restaurants(ai_response.vector)
        
        return ai_response

    async def process_recommend_query(self, request: SearchRecommendRequest) -> SearchRecommendResponse:
        """
        Đây là Hàm xử lý chính cho logic tìm kiếm quán ăn kết hợp GPS.
        """
        # Mocking processing time as if calling AI engine and PostGIS DB
        import asyncio
        await asyncio.sleep(2)
        
        fake_results = [
            RecommendResult(
                id=1, name="Mì Cay Sasin - Làng Đại Học", match="98%", dist="1.1 km", price="49k - 89k", rating="4.9",
                reason="Khớp hoàn hảo: Nằm ngay trục đường sầm uất của Làng Đại Học. Nước dùng chuẩn vị, không gian có máy lạnh.",
                img="/images/food1.jpg"
            ),
            RecommendResult(
                id=2, name="Mì Cay Seoul - Dĩ An", match="94%", dist="2.8 km", price="45k - 75k", rating="4.7",
                reason="Nằm hướng về trung tâm Dĩ An. Nước súp đậm đà cay nồng, sợi mì dai và trân châu đường đen đi kèm cực cuốn.",
                img="/images/food2.jpg"
            ),
            RecommendResult(
                id=3, name="Mì Cay Naga - Làng Đại Học", match="89%", dist="1.2 km", price="40k - 65k", rating="4.5",
                reason="Giải pháp tối ưu ngân sách cho sinh viên cuối tháng. Giá cả cực kỳ hạt dẻ nhưng topping hải sản vẫn rất đầy đặn.",
                img="/images/food3.jpg"
            ),
            RecommendResult(
                id=4, name="Yagami - Ẩm Thực Lẩu Thái-Nhật-Hàn", match="85%", dist="4.5 km", price="45k - 79k", rating="4.8",
                reason="Không gian check-in cực đẹp mang hơi hướng sang trọng, khuyên thử món mì cay bạch tuộc tươi giòn.",
                img="/images/food4.jpg"
            ),
            RecommendResult(
                id=5, name="Mì Cay Sasin Hoàng Diệu 2", match="82%", dist="5.2 km", price="40k - 65k", rating="4.6",
                reason="Tọa lạc trên con phố ẩm thực nhộn nhịp. Thích hợp cho những buổi tối cuối tuần muốn đi xa trường một chút.",
                img="/images/food5.jpg"
            ),
        ]
        return SearchRecommendResponse(results=fake_results)
    async def extract_intent(self, request: ExtractIntentRequest) -> ExtractIntentResponse:
        """
        NLP parser endpoint:
        - regex budget extraction
        - tag extraction
        - PhoBERT 768-d vector generation
        """
        text = request.text
        query_vector = self._generate_query_vector(text)

        return ExtractIntentResponse(
            raw_text=text,
            tags=self._extract_tags(text),
            budget=self._extract_budget(text),
            query_vector=query_vector,
            lat=request.lat,
            lng=request.lng,
        )

    def _extract_budget(self, text: str) -> Optional[int]:
        text = text.lower().strip()

        # Ví dụ: 200k, 150k
        match_k = re.search(r"(\d+)\s*k", text)
        if match_k:
            return int(match_k.group(1)) * 1000

        # Ví dụ: 200000đ, 200000 vnd
        match_vnd = re.search(r"(\d+)\s*(vnd|đ|dong)?", text)
        if match_vnd:
            value = int(match_vnd.group(1))
            if value >= 1000:
                return value

        return None

    def _extract_tags(self, text: str) -> list[str]:
        text = text.lower().strip()

        # Bỏ phần budget để không lẫn vào tags
        text = re.sub(r"\d+\s*k", " ", text)
        text = re.sub(r"\d+\s*(vnd|đ|dong)?", " ", text)

        stop_words = {
            "duoi", "dưới", "tren", "trên", "tam", "tầm", "khoang", "khoảng",
            "gia", "giá", "quan", "quán", "mon", "món", "toi", "tôi",
            "muon", "muốn", "an", "ăn", "toi_muon", "món_ăn"
        }

        words = re.findall(r"\w+", text, flags=re.UNICODE)

        tags = []
        for w in words:
            if w in stop_words:
                continue
            if w.isdigit():
                continue
            if w not in tags:
                tags.append(w)

        return tags

    def _generate_query_vector(self, text: str) -> list[float]:
        """
        Tạo vector 768 chiều bằng PhoBERT base.
        Dùng mean pooling trên last_hidden_state.
        """
        inputs = tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=128
        )

        with torch.no_grad():
            outputs = model(**inputs)
            last_hidden_state = outputs.last_hidden_state
            attention_mask = inputs["attention_mask"].unsqueeze(-1)

            masked_embeddings = last_hidden_state * attention_mask
            sum_embeddings = masked_embeddings.sum(dim=1)
            valid_tokens = attention_mask.sum(dim=1).clamp(min=1)
            vector = sum_embeddings / valid_tokens

        return vector.squeeze(0).tolist()
