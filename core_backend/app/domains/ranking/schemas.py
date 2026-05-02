from pydantic import BaseModel, Field
from typing import List, Optional


class Candidate(BaseModel):
    """Ứng viên nhà hàng với vector embedding để tính cosine similarity."""
    res_id: str = Field(..., description="ID định danh của nhà hàng (UUID hoặc string)")
    vector: List[float] = Field(..., description="Vector đặc trưng (embedding) của nhà hàng")


class CandidateWithFeatures(BaseModel):
    """
    Ứng viên đã được sơ chế thành số nguyên để gửi sang AI Engine.
    Tất cả features dạng int (nhân 100 để tránh float precision issues).
    """
    res_id: str = Field(..., description="ID định danh của nhà hàng")
    rating: int = Field(0, description="Rating nhân 100 (VD: 4.5 → 450)")
    sentiment_score: int = Field(0, description="Sentiment nhân 100 (VD: 0.8 → 80)")
    distance_m: int = Field(0, description="Khoảng cách tính bằng mét")
    price_normalized: int = Field(0, description="% ngân sách (0-100)")
    review_count: int = Field(0, ge=0)
    similarity_score: int = Field(0, description="Điểm LightFM (AI Engine sẽ điền)")
    is_open: int = Field(0, description="1 nếu đang mở cửa, 0 nếu đóng")


class UserRankRequest(BaseModel):
    """Request đầu vào từ Client gọi đến Core Backend."""
    user_id: str = Field(..., description="ID định danh của người dùng")

    # query_vector là vector embedding của câu query hiện tại.
    # Dùng để semantic search với embedding_vector của nhà hàng trong DB.
    # Không dùng user_vector ở đây vì user_vector là sở thích dài hạn,
    # còn query_vector đại diện cho nhu cầu tìm kiếm hiện tại của user.
    query_vector: List[float] = Field(
        ...,
        description="Vector embedding của câu query người dùng"
    )

    user_location: List[float] = Field(
        ...,
        min_length=2,
        max_length=2,
        description="Tọa độ người dùng [vĩ độ, kinh độ]"
    )

    k: int = Field(default=10, ge=1, le=50, description="Số lượng kết quả cần trả về")
    offset: int = Field(default=0, ge=0)

    tags: List[str] = Field(default_factory=list)
    budget: int = Field(default=100000, ge=0, description="Ngân sách tối đa (VNĐ)")
    radius: float = Field(default=5.0, ge=0.0, description="Bán kính tìm kiếm (km)")


class RankResponse(BaseModel):
    """Kết quả trả về danh sách ID đã được AI xếp hạng."""
    ranked_ids: List[str] = Field(..., description="Danh sách ID nhà hàng từ cao xuống thấp")
    scores: Optional[List[float]] = None
