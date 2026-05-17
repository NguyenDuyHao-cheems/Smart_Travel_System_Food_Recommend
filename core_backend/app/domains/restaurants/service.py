from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.domains.users.models import UserAccount
from .repository import RestaurantRepository
from .schema import RestaurantDetailResponse, DishResponse, ReviewCreate, ReviewResponse


class RestaurantService:
    @staticmethod
    async def get_restaurant_detail(db: Session, restaurant_id: str) -> RestaurantDetailResponse:
        restaurant = RestaurantRepository.get_by_id(db, restaurant_id)
        if not restaurant:
            raise HTTPException(status_code=404, detail="Restaurant not found")

        dishes = RestaurantRepository.get_dishes_by_restaurant_id(db, restaurant_id)
        tags = [tag.name for tag in (restaurant.tags or [])]
        reviews = RestaurantRepository.get_reviews_by_restaurant_id(db, restaurant_id, limit=50)

        return RestaurantDetailResponse(
            id=restaurant.id,
            name=restaurant.name,
            address=restaurant.address,
            google_maps_url=restaurant.google_maps_url,
            image_url=restaurant.image_url,
            rating_avg=restaurant.rating_avg or 0.0,
            total_reviews=getattr(restaurant, "total_reviews", 0) or 0,
            price_range=getattr(restaurant, "price_range", None),
            open_time=str(restaurant.open_time)[:5] if getattr(restaurant, "open_time", None) else None,
            close_time=str(restaurant.close_time)[:5] if getattr(restaurant, "close_time", None) else None,
            is_open_now=getattr(restaurant, "is_open_now", False),
            lat=restaurant.lat,
            lng=restaurant.lng,
            tags=tags,
            reviews=[
                ReviewResponse(
                    id=str(r.id),
                    user_id=str(r.user_id) if r.user_id else None,
                    reviewer_name=(
                        f"Người ẩn danh số {r.anonymous_number}"
                        if getattr(r, "is_anonymous", False) and r.user_id
                        else (
                            r.user.full_name or r.user.username
                            if (r.user_id and getattr(r, "user", None) and r.user)
                            else (r.reviewer_name or "Ẩn danh")
                        )
                    ),
                    rating=r.rating,
                    text=r.text,
                    date=str(r.date) if r.date else None,
                    is_anonymous=getattr(r, "is_anonymous", False),
                    anonymous_number=getattr(r, "anonymous_number", None),
                )
                for r in reviews
            ],
            dishes=[DishResponse.model_validate(d) for d in dishes]
        )

    @staticmethod
    async def check_anonymous_status(db: Session, restaurant_id: str, current_user: UserAccount):
        anon_num = RestaurantRepository.get_user_anonymous_number(db, restaurant_id, current_user.id)
        return {"anonymous_number": anon_num}

    @staticmethod
    async def add_review(
        db: Session,
        restaurant_id: str,
        current_user: UserAccount,
        data: ReviewCreate,
    ) -> ReviewResponse:
        if not RestaurantRepository.get_by_id(db, restaurant_id):
            raise HTTPException(status_code=404, detail="Không tìm thấy nhà hàng.")

        reviewer_name = current_user.full_name or current_user.username
        display_name = reviewer_name

        anonymous_number = None
        if data.is_anonymous:
            # 1. Tìm xem user đã từng ẩn danh ở đây chưa
            anonymous_number = RestaurantRepository.get_user_anonymous_number(db, restaurant_id, current_user.id)
            
            # 2. Nếu chưa, chạy vòng lặp retry lấy số mới
            if anonymous_number is None:
                from sqlalchemy.exc import IntegrityError
                from sqlalchemy import func
                from app.domains.ranking.models import ReviewModel
                for attempt in range(3):
                    try:
                        max_num = db.query(func.max(ReviewModel.anonymous_number)).filter(ReviewModel.res_id == restaurant_id).scalar() or 0
                        anonymous_number = max_num + 1
                        
                        review = RestaurantRepository.create_review_model(
                            db,
                            restaurant_id=restaurant_id,
                            user_id=current_user.id,
                            reviewer_name=reviewer_name,
                            rating=data.rating,
                            text=data.text,
                            is_anonymous=True,
                            anonymous_number=anonymous_number
                        )
                        break
                    except IntegrityError:
                        db.rollback()
                        if attempt == 2:
                            raise HTTPException(status_code=409, detail="Hệ thống bận, vui lòng thử lại")
            else:
                # Đã có số cũ, dùng lại số cũ
                review = RestaurantRepository.create_review_model(
                    db,
                    restaurant_id=restaurant_id,
                    user_id=current_user.id,
                    reviewer_name=reviewer_name,
                    rating=data.rating,
                    text=data.text,
                    is_anonymous=True,
                    anonymous_number=anonymous_number
                )
        else:
            # Không ẩn danh
            review = RestaurantRepository.create_review_model(
                db,
                restaurant_id=restaurant_id,
                user_id=current_user.id,
                reviewer_name=reviewer_name,
                rating=data.rating,
                text=data.text,
                is_anonymous=False,
                anonymous_number=None
            )

        # Tích hợp tracking tương tác (Interaction Tracking)
        try:
            from app.domains.users.repository import UserInteractionRepository
            import logging
            logger = logging.getLogger("uvicorn.error")

            interaction_repo = UserInteractionRepository(db)
            interaction_repo.create_interaction(
                action_type="REVIEW_RESTAURANT",
                user_id=str(current_user.id) if current_user.id else None,
                res_id=str(review.res_id) if review.res_id else None,
                metadata={"rating": review.rating}
            )
        except Exception as e:
            import logging
            logger = logging.getLogger("uvicorn.error")
            logger.error(f"Failed to log review interaction: {e}")

        display_name = f"Người ẩn danh số {review.anonymous_number}" if review.is_anonymous else reviewer_name

        return ReviewResponse(
            id=str(review.id),
            user_id=str(review.user_id) if review.user_id else None,
            reviewer_name=display_name,
            rating=review.rating,
            text=review.text,
            date=str(review.date) if review.date else None,
            is_anonymous=review.is_anonymous,
            anonymous_number=review.anonymous_number,
        )

    @staticmethod
    async def delete_review(db: Session, review_id: str, current_user: UserAccount) -> None:
        review = RestaurantRepository.get_review_by_id(db, review_id)
        if not review:
            raise HTTPException(status_code=404, detail="Không tìm thấy bình luận này.")

        # IDOR protection: compare as strings (both are UUID from PostgreSQL)
        if str(review.user_id) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Bạn không có quyền xóa bình luận này.")

        RestaurantRepository.delete_review(db, review_id)
