from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.dependencies import get_db, get_optional_current_user, get_current_user
from app.domains.users.models import UserAccount
from app.domains.search.schemas import RecommendResult
from .schemas import HomeRecommendationResponse
from .service import RecommendationService
from app.services.ai_client import get_ai_client

router = APIRouter()

@router.get("/recommendations/home", response_model=HomeRecommendationResponse)
def get_home_recommendations(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    limit: int = Query(6, description="Limit of results"),
    user: UserAccount | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    results = RecommendationService.get_home_recommendations(user, lat, lng, limit, db)
    return HomeRecommendationResponse(results=results)


@router.post("/admin/recommendations/reload")
async def reload_recommendations():
    """
    [Admin/CLI Call] Yêu cầu AI Engine nạp nóng lại mô hình gợi ý LightFM mới từ đĩa.
    """
    try:
        result = await get_ai_client().reload_recommendation_model()
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Không thể yêu cầu reload mô hình từ AI Engine: {str(e)}"
        )


@router.get("/restaurants/recommendations", response_model=List[RecommendResult])
async def get_personalized_recommendations(
    limit: int = Query(10, description="Limit of results"),
    lat: float = Query(10.880, description="Latitude for distance calculation"),
    lng: float = Query(106.808, description="Longitude for distance calculation"),
    current_user: UserAccount = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách quán ăn gợi ý cá nhân hóa dựa trên mô hình LightFM cho người dùng đã đăng nhập.
    Nếu gặp Cold Start hoặc lỗi hệ thống, tự động chuyển đổi sang Popularity Fallback.
    """
    return await RecommendationService.get_personalized_recommendations(
        user=current_user,
        db=db,
        limit=limit,
        lat=lat,
        lng=lng
    )

