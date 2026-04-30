"""
schemas.py — Pydantic schemas for the AI Engine ranking endpoint.

Khớp với contract từ Core Backend:
  - res_id: str (UUID)
  - Tất cả features là int (đã nhân 100 từ Core Backend FeatureService)
  - similarity_score: int (AI Engine sẽ điền qua LightFM)
"""

from pydantic import BaseModel, Field
from typing import List, Optional


class CandidateWithFeatures(BaseModel):
    """Feature vector for a single restaurant candidate (integer-scaled)."""

    res_id: str = Field(..., description="ID nhà hàng (UUID/string)")
    rating: int = Field(0, description="Rating nhân 100 (VD: 4.5 → 450)")
    sentiment_score: int = Field(0, description="Sentiment nhân 100 (VD: 0.8 → 80)")
    distance_m: int = Field(0, description="Khoảng cách tính bằng mét")
    price_normalized: int = Field(0, description="% ngân sách (0-100)")
    review_count: int = Field(0, ge=0)
    similarity_score: int = Field(0, description="Điểm LightFM (AI Engine sẽ điền)")
    is_open: int = Field(0, description="1 nếu đang mở cửa")


class RankRequestPayload(BaseModel):
    """Request body cho POST /api/v1/ml/rank."""

    user_id: str = Field(..., description="ID định danh của người dùng")
    candidates: List[CandidateWithFeatures] = Field(
        ..., min_length=1,
        description="Danh sách ứng viên cần xếp hạng",
    )
    top_k: int = Field(default=10, ge=1, le=50)


class RankResponse(BaseModel):
    """Response từ AI Engine ranking."""

    ranked_ids: List[str] = Field(
        ...,
        description="Danh sách res_id đã sắp xếp theo thứ tự relevance giảm dần",
    )
    scores: Optional[List[float]] = Field(
        None,
        description="Predicted relevance scores tương ứng với ranked_ids",
    )
