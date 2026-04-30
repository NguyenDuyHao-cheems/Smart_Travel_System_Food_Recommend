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
    budget: Optional[int] = Field(None, ge=0, description="Optional explicit budget in VND from user. Takes priority over AI-extracted budget.")

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
    Kết quả trả về cho UI, kèm metadata để Frontend biết
    backend có đang dùng cơ chế fallback hay không.
    """
    results: List[RecommendResult]
    fallback_applied: bool = Field(
        default=False,
        description="True nếu backend đã tự động nới điều kiện tìm kiếm."
    )
    fallback_reason: Optional[str] = Field(
        default=None,
        description="Mô tả lý do backend áp dụng fallback."
    )
    applied_radius_km: float = Field(
        ...,
        ge=0,
        description="Bán kính thực tế backend dùng để tìm kiếm."
    )
    applied_budget: Optional[int] = Field(
        None,
        ge=0,
        description="Ngân sách thực tế backend dùng để lọc."
    )
    filtered_out_count: Optional[int] = Field(
        None, 
        description="Number of items filtered out due to allergies"
    )
    warning: Optional[str] = Field(
        None, 
        description="Warning message, e.g. when fallback is applied"
    )

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
