"""
schemas.py — Pydantic schemas for the AI Engine ranking endpoint.
"""

from pydantic import BaseModel, Field
from typing import List


class RankCandidate(BaseModel):
    """Feature vector for a single restaurant candidate."""

    res_id: int = Field(..., description="ID nhà hàng")
    similarity_score: float = Field(
        default=0.0, ge=0.0, le=1.0,
        description="Cosine similarity giữa query vector và dish embedding",
    )
    rating: float = Field(
        default=0.0, ge=0.0, le=5.0,
        description="Điểm đánh giá trung bình (0–5)",
    )
    sentiment_score: float = Field(
        default=0.0, ge=-1.0, le=1.0,
        description="Điểm cảm xúc tổng hợp từ reviews (−1 đến 1)",
    )
    distance_km: float = Field(
        default=0.0, ge=0.0,
        description="Khoảng cách từ người dùng đến nhà hàng (km)",
    )
    price_normalized: float = Field(
        default=1.0, ge=0.0,
        description="Mức giá bình thường hóa so với ngân sách (price_avg / budget)",
    )
    review_count: int = Field(
        default=0, ge=0,
        description="Tổng số lượt đánh giá",
    )


class RankRequest(BaseModel):
    """Request body cho POST /api/v1/ranking/rank."""

    candidates: List[RankCandidate] = Field(
        ..., min_length=1,
        description="Danh sách ứng viên cần xếp hạng",
    )
    top_k: int = Field(
        default=10, ge=1, le=50,
        description="Số lượng kết quả tối đa trả về",
    )


class RankResponse(BaseModel):
    """Response từ LambdaMART ranking."""

    ranked_ids: List[int] = Field(
        ...,
        description="Danh sách res_id đã sắp xếp theo thứ tự relevance giảm dần",
    )
    scores: List[float] = Field(
        ...,
        description="Predicted relevance scores tương ứng với ranked_ids",
    )
