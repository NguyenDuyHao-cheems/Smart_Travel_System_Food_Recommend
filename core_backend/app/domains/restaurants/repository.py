import uuid
from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import Optional
from app.domains.ranking.models import RestaurantModel, DishModel, ReviewModel


class RestaurantRepository:
    @staticmethod
    def get_by_id(db: Session, restaurant_id: str) -> Optional[RestaurantModel]:
        return db.query(RestaurantModel).filter(RestaurantModel.id == restaurant_id).first()

    @staticmethod
    def search_restaurants(db: Session, query: str = "", lat: float = None, lng: float = None, limit: int = 5):
        from sqlalchemy import or_, desc
        db_query = db.query(RestaurantModel).filter(RestaurantModel.is_active == True)
        
        if query:
            db_query = db_query.filter(RestaurantModel.name.ilike(f"%{query}%"))
            
        if lat is not None and lng is not None:
            # Approximate Euclidean distance sorting
            from sqlalchemy import func
            distance = func.power(RestaurantModel.lat - lat, 2) + func.power(RestaurantModel.lng - lng, 2)
            db_query = db_query.order_by(distance)
        else:
            db_query = db_query.order_by(desc(RestaurantModel.rating_avg))
            
        return db_query.limit(limit).all()

    @staticmethod
    def get_dishes_by_restaurant_id(db: Session, restaurant_id: str):
        return db.query(DishModel).filter(DishModel.res_id == restaurant_id).all()

    @staticmethod
    def get_reviews_by_restaurant_id(db: Session, restaurant_id: str, limit: int = 50):
        return (
            db.query(ReviewModel)
            .options(joinedload(ReviewModel.user))
            .filter(ReviewModel.res_id == restaurant_id)
            .order_by(ReviewModel.date.desc())
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_review_by_id(db: Session, review_id: str) -> Optional[ReviewModel]:
        return db.query(ReviewModel).filter(ReviewModel.id == review_id).first()

    @staticmethod
    def get_user_anonymous_number(db: Session, restaurant_id: str, user_id: str) -> Optional[int]:
        review = (
            db.query(ReviewModel)
            .filter(
                ReviewModel.res_id == restaurant_id,
                ReviewModel.user_id == user_id,
                ReviewModel.is_anonymous == True,
                ReviewModel.anonymous_number != None
            )
            .first()
        )
        return review.anonymous_number if review else None

    @staticmethod
    def create_review_model(
        db: Session,
        restaurant_id: str,
        user_id,
        reviewer_name: str,
        rating: float,
        text: Optional[str],
        is_anonymous: bool = False,
        anonymous_number: Optional[int] = None,
    ) -> ReviewModel:
        review = ReviewModel(
            id=str(uuid.uuid4()),
            res_id=restaurant_id,
            user_id=user_id,
            reviewer_name=reviewer_name,
            rating=rating,
            text=text,
            date=datetime.now().strftime("%Y-%m-%d"),
            is_anonymous=is_anonymous,
            anonymous_number=anonymous_number,
        )
        db.add(review)
        db.commit()
        db.refresh(review)
        RestaurantRepository._update_stats(db, restaurant_id)
        return review

    @staticmethod
    def delete_review(db: Session, review_id: str) -> bool:
        review = db.query(ReviewModel).filter(ReviewModel.id == review_id).first()
        if not review:
            return False
        restaurant_id = review.res_id
        db.delete(review)
        db.commit()
        RestaurantRepository._update_stats(db, restaurant_id)
        return True

    @staticmethod
    def _update_stats(db: Session, restaurant_id: str) -> None:
        restaurant = db.query(RestaurantModel).filter(RestaurantModel.id == restaurant_id).first()
        if not restaurant:
            return
        agg = db.query(
            func.avg(ReviewModel.rating),
            func.count(ReviewModel.id)
        ).filter(ReviewModel.res_id == restaurant_id).one()
        restaurant.rating_avg = round(float(agg[0] or 0), 2)
        restaurant.total_reviews = int(agg[1] or 0)
        db.commit()
