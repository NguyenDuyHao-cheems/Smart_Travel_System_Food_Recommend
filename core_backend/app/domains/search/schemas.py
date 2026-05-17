from pydantic import BaseModel, Field
from typing import List, Optional, Union
from uuid import UUID
from datetime import datetime

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
    tag_name: Optional[str] = Field(None, description="Optional tag name for explicit filtering (e.g., 'gà', 'phở')")
    search_mode: Optional[str] = Field(
        "basic",
        description="Loại tìm kiếm (basic hoặc emotion). emotion kết hợp cảm xúc query và tín hiệu review sentiment.",
    )

class AllergenDishWarning(BaseModel):
    """Thông tin chi tiết món ăn gây dị ứng trong 1 quán."""
    dish_name: str
    matched_allergens: List[str]

class RecommendResult(BaseModel):
    """
    Schema định dạng đầu ra 1 quán ăn cho UI.
    distance_km là giá trị số để frontend filter client-side.
    """
    id: str
    name: str
    match: str
    dist: str           # display string, e.g. "1.2 km"
    distance_km: float = 0.0  # numeric value for client-side filtering
    price: str
    rating: str
    reason: str
    img: str
    total_reviews: Optional[int] = 0
    google_maps_url: Optional[str] = None
    allergen_warning: Optional[List[AllergenDishWarning]] = None
    sentiment_score: Optional[float] = Field(
        None,
        ge=-1.0,
        le=1.0,
        description="Điểm sentiment tổng hợp từ review, chuẩn hóa -1..1.",
    )
    sentiment_label: Optional[str] = Field(
        None,
        description="Nhãn sentiment tổng hợp: positive, neutral hoặc negative.",
    )
    sentiment_review_count: Optional[int] = Field(
        0,
        ge=0,
        description="Số review đã được dùng/đại diện cho sentiment của nhà hàng.",
    )

class SearchRecommendResponse(BaseModel):
    """
    Kết quả trả về cho UI. Backend không còn lọc theo bán kính —
    toàn bộ kết quả sắp xếp theo semantic relevance.
    Việc lọc khoảng cách là tuỳ chọn phía Frontend dựa trên trường distance_km.
    """
    results: List[RecommendResult]
    fallback_applied: bool = Field(
        default=False,
        description="True nếu allergy filter loại toàn bộ, backend dùng fallback."
    )
    fallback_reason: Optional[str] = Field(
        default=None,
        description="Mô tả lý do fallback (nếu có)."
    )
    applied_budget: Optional[int] = Field(
        None,
        ge=0,
        description="Ngân sách thực tế backend dùng để lọc."
    )
    filtered_out_count: Optional[int] = Field(
        None,
        description="Số lượng quán bị loại (Legacy, hiện bằng 0)."
    )
    allergen_flagged_count: Optional[int] = Field(
        0,
        description="Số lượng quán có món gây dị ứng."
    )
    warning: Optional[str] = Field(
        None,
        description="Thông báo cảnh báo (ví dụ: dị ứng)."
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
    cleaned_query: str = Field(..., description="Query đã được Gemini làm sạch")

class SessionCreateResponse(BaseModel):
    """Response trả về khi tạo session tìm kiếm mới."""
    session_id: Union[str, UUID]
    results: List[RecommendResult]
    fallback_applied: bool = False
    fallback_reason: Optional[str] = None
    applied_budget: Optional[int] = None
    filtered_out_count: Optional[int] = None
    allergen_flagged_count: Optional[int] = 0
    warning: Optional[str] = None

class SessionDataResponse(BaseModel):
    """Response trả về khi truy vấn session đã lưu."""
    session_id: Union[str, UUID]
    query: str
    results: List[RecommendResult]
    fallback_applied: bool = False
    fallback_reason: Optional[str] = None
    applied_budget: Optional[int] = None
    filtered_out_count: Optional[int] = None
    allergen_flagged_count: Optional[int] = 0
    warning: Optional[str] = None
    created_at: Optional[datetime] = None
