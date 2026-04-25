from pydantic import BaseModel, Field
from typing import List, Optional, Any

class Candidate(BaseModel):
    # Sử dụng alias để khớp với dữ liệu từ Core Backend gửi sang
    id: str = Field(..., alias="res_id")
    embedding_vector: Optional[List[float]] = Field(None, alias="vector")
    
    # Thông tin bổ sung để trả về cho Frontend
    dish_name: Optional[str] = None
    restaurant_name: Optional[str] = None
    price: Optional[float] = 0.0
    image_url: Optional[str] = None
    address: Optional[str] = None
    
    # Metadata chứa tags/ingredients để phục vụ lọc dị ứng (Re-ranker)
    metadata: Optional[dict] = {}

    class Config:
        # Cho phép khởi tạo bằng cả tên biến (id) hoặc tên alias (res_id)
        populate_by_name = True

class RankRequest(BaseModel):
    user_id: Any  # Chấp nhận cả số (int) hoặc chuỗi (str)
    user_vector: List[float]
    pref_vector: Optional[List[float]] = None # Dự phòng nếu backend gửi tên khác
    
    # Các tiêu chí lọc bổ sung
    tags: List[str] = []
    budget: Optional[float] = 0.0
    user_location: List[float] = [0.0, 0.0] # [lat, lon]
    radius: float = 5.0 # Bán kính tìm kiếm (km)
    user_allergies: Optional[List[str]] = []
    
    # Danh sách các ứng viên cần được xếp hạng
    candidates: List[Candidate]

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "24120261",
                "user_vector": [0.1, -0.2, 0.5],
                "user_allergies": ["hải sản", "đậu phộng"],
                "candidates": [
                    {
                        "res_id": "dish_abc_123",
                        "vector": [0.01, 0.05, -0.1],
                        "dish_name": "Bún Đậu Mắm Tôm",
                        "restaurant_name": "Quán A",
                        "price": 45000,
                        "metadata": {"tags": ["bún", "mắm tôm", "đậu phụ"]}
                    }
                ]
            }
        }

class RankResponse(BaseModel):
    status: str = "success"
    ranked_candidates: List[Any] = []