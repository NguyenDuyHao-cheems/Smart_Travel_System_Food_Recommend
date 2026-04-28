from pydantic import BaseModel, Field
from typing import List

class Candidate(BaseModel):
    res_id: int = Field(..., description="ID định danh của nhà hàng")
    vector: List[float] = Field(..., description="Vector đặc trưng (embedding) của nhà hàng cần xếp hạng")

class RankRequest(BaseModel):
    user_id: str = Field(..., description="ID định danh của người dùng")
    pref_vector: List[float] = Field(..., description="Vector sở thích của người dùng để tính độ tương đồng")

    k: int = Field(default=5, ge=1, le=50, description="Số lượng kết quả nhà hàng tối đa cần trả về")
    offset: int = Field(default=0, ge=0, description="Vị trí bắt đầu của danh sách kết quả (dùng cho phân trang)")

    tags: List[str] = Field(default_factory=list, description="Danh sách các thẻ phân loại (ví dụ: 'đồ ăn chay', 'không gian ngoài trời')")
    budget: float = Field(default=100.0, ge=0.0, description="Mức chi phí tối đa dự kiến của người dùng")

    user_location: List[float] = Field(default_factory=lambda: [0.0, 0.0], description="Tọa độ vị trí người dùng dạng [kinh độ, vĩ độ]")
    radius: float = Field(default=1.0, ge=0.0, description="Bán kính (km) được cho phép tìm kiếm xung quanh vị trí người dùng")
    
class RankResponse(BaseModel):
    top_ids: List[int] = Field(..., description="Danh sách ID các nhà hàng được gợi ý xếp hạng từ cao xuống thấp thông qua AI")
