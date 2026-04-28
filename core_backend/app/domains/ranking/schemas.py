from pydantic import BaseModel, Field
from typing import List, Optional

class CandidateWithFeatures(BaseModel):
    """
    Dữ liệu ứng viên đã được sơ chế thành số nguyên để gửi sang AI Engine.
    Lưu ý: res_id để str để tương thích tốt với UUID/String ID.
    """
    res_id: str = Field(..., description="ID định danh của nhà hàng")
    rating: int = Field(0, description="Rating nhân 100 (Ví dụ: 4.5 -> 450)")
    sentiment_score: int = Field(0, description="Sentiment nhân 100 (Ví dụ: 0.8 -> 80)")
    distance_m: int = Field(0, description="Khoảng cách tính bằng mét (Số nguyên)")
    price_normalized: int = Field(0, description="% ngân sách (0-100)")
    review_count: int = Field(0, ge=0)
    similarity_score: int = Field(0, description="Điểm LightFM (Sẽ được AI Engine điền)")


class UserRankRequest(BaseModel):
    """
    Request đầu vào từ Client gọi đến Core Backend.
    """
    user_id: str = Field(..., description="ID định danh của người dùng")
    
    # Sửa lỗi Pydantic V2: Dùng min_length và max_length cho List
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
    """
    Kết quả trả về danh sách ID đã được AI xếp hạng.
    """
    ranked_ids: List[str] = Field(..., description="Danh sách ID nhà hàng từ cao xuống thấp")
    scores: Optional[List[float]] = None