from pydantic import BaseModel, Field
from typing import List, Optional

class SearchRequest(BaseModel):
    """
    Schema for the core backend to receive a user search query.
    """
    query: str = Field(..., description="The user's raw text search query")

class SearchRecommendRequest(BaseModel):
    """
    Schema này dùng để hứng kết quả từ việc bắt GPS bên Frontend đẩy xuống qua API.
    """
    query: str = Field(..., description="The user's required food and context")
    lat: float = Field(..., description="Current user latitude")
    lng: float = Field(..., description="Current user longitude")
    user_id: Optional[str] = Field(None, description="Optional user ID for personalized filtering")

class RecommendResult(BaseModel):
    """
    Schema này định dạng đầu ra bắt buộc của 1 quán ăn để thẻ UI hiển thị trên Frontend không bị vỡ.
    """
    id: int
    name: str
    match: str
    dist: str
    price: str
    rating: str
    reason: str
    img: str

class SearchRecommendResponse(BaseModel):
    """
    Kết quả trả về dạng danh sách (List) đẩy về cho UI Next.js Render.
    """
    results: List[RecommendResult]
    filtered_out_count: Optional[int] = Field(None, description="Number of items filtered out due to allergies")
    warning: Optional[str] = Field(None, description="Warning message, e.g. when fallback is applied")

class AISearchPayload(BaseModel):
    """
    Schema representing the payload sent to the ai_engine for processing.
    """
    text: str = Field(..., description="The raw text to be processed by the AI engine")

class AIResponseData(BaseModel):
    """
    Schema representing the structured response returned by the ai_engine.
    """
    vector: List[float] = Field(..., description="The generated embedded vector representation of the text")
    budget: Optional[int] = Field(None, description="The budget extracted from the text, if any")
    intent: Optional[str] = Field(None, description="The extracted intent of the user search")
