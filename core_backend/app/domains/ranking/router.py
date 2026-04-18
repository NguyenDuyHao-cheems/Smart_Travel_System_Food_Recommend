from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

# Import đúng đường dẫn cấu trúc thư mục của Bảo
from .schemas import RankRequest, RankResponse
from .service import RankingService
from app.core.database import SessionLocal 

router = APIRouter()

# Khởi tạo Service một lần để dùng chung Cache (Singleton)
ranking_service = RankingService()

# Dependency để lấy DB Session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/ml/rank-candidates", response_model=RankResponse)
def rank_candidates(request: RankRequest, db: Session = Depends(get_db)):
    """
    Endpoint thực hiện Pipeline:
    1. Retrieval: Lọc thô từ Postgres (tags, budget, location, is_open)
    2. Ranking: Xếp hạng bằng NumPy Cosine Similarity
    """
    try:
        # Gọi hàm điều phối chính trong RankingService
        top_ids = ranking_service.get_recommendations(db, request)
        # Trả về kết quả theo đúng Schema RankResponse
        return RankResponse(top_ids=top_ids)
        
    except Exception as e:
        # Log lỗi ra console để Bảo dễ debug khi chạy
        print(f"--- [RANKING ERROR] ---: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Lỗi hệ thống khi xử lý gợi ý: {str(e)}"
        )