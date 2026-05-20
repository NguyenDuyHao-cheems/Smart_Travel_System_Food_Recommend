from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, get_current_user
from app.domains.users.models import UserAccount
from .schema import RestaurantDetailResponse, ReviewCreate, ReviewResponse
from .service import RestaurantService

router = APIRouter()


@router.get("/restaurants/{id}", response_model=RestaurantDetailResponse)
async def get_restaurant_detail(id: str, db: Session = Depends(get_db)):
    """Lấy thông tin chi tiết của một nhà hàng bao gồm danh sách món ăn và bình luận."""
    return await RestaurantService.get_restaurant_detail(db, id)

@router.get("/reviews/check-anonymous")
async def check_anonymous_status(
    restaurant_id: str,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user),
):
    """Kiểm tra xem người dùng đã từng ẩn danh tại nhà hàng này chưa."""
    return await RestaurantService.check_anonymous_status(db, restaurant_id, current_user)


@router.post("/restaurants/{id}/reviews", response_model=ReviewResponse, status_code=201)
async def create_review(
    id: str,
    data: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user),
):
    """Đăng bình luận cho nhà hàng. Yêu cầu đăng nhập."""
    return await RestaurantService.add_review(db, id, current_user, data)


@router.delete("/restaurants/{restaurant_id}/reviews/{review_id}", status_code=204)
async def delete_review(
    restaurant_id: str,
    review_id: str,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user),
):
    """Xóa bình luận. Chỉ chủ sở hữu mới được xóa (IDOR protected)."""
    await RestaurantService.delete_review(db, review_id, current_user)
