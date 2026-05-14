from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from pgvector.sqlalchemy import Vector
from app.core.config import settings


class RestaurantModel(Base):
    __tablename__ = "restaurants"

    # id là String để support UUID (khớp ERD bản NEW)
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    address = Column(String, nullable=True)
    lat = Column(Float)
    lng = Column(Float)

    # Tên field khớp ERD bản NEW
    price_range = Column(String, nullable=True)     # giá dạng string, vd "50000-100000"
    rating_avg = Column(Float, nullable=True)        # rating trung bình (0–5)
    sentiment_score = Column(Float, nullable=True)  # tổng hợp sentiment (−1 đến 1)
    total_reviews = Column(Integer, nullable=True)  # tổng số lượt đánh giá
    is_active = Column(Boolean, default=True)       # nhà hàng còn hoạt động
    is_open_now = Column(Boolean, default=False)    # đang mở cửa tại thời điểm này
    is_vegetarian = Column(Boolean, default=False)  # nhà hàng chuyên chay hoặc có menu chay

    # Cột vector embedding (pgvector) cho semantic search
    embedding_vector = Column(Vector(settings.VECTOR_DIM), nullable=True)

    image_url = Column(String, nullable=True)
    opening_hours = Column(String, nullable=True)
    google_maps_url = Column(String, nullable=True)

    tag_match: bool = False  # non-DB field for boosting/ranking

    tags = relationship("TagModel", secondary="res_tags", back_populates="restaurants")
    dishes = relationship("DishModel", back_populates="restaurant")


class DishModel(Base):
    __tablename__ = "dishes"

    id = Column(String, primary_key=True, index=True)
    res_id = Column(String, ForeignKey("restaurants.id"), index=True)
    name = Column(String, nullable=False)
    price = Column(Integer, nullable=False)
    image_url = Column(String, nullable=True)
    allergens = Column(JSON, default=[])
    is_vegetarian = Column(Boolean, default=False)
    embedding_vector = Column(Vector(settings.VECTOR_DIM), nullable=True)

    restaurant = relationship("RestaurantModel", back_populates="dishes")



class TagModel(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)   # khớp bản NEW (TagModel.name thay vì tag_name)

    restaurants = relationship("RestaurantModel", secondary="res_tags", back_populates="tags")


class RestaurantTagModel(Base):
    __tablename__ = "res_tags"   # khớp bản NEW

    res_id = Column(String, ForeignKey("restaurants.id"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("tags.id"), primary_key=True)


class InteractionModel(Base):
    __tablename__ = "user_interactions"

    id = Column(String, primary_key=True, index=True)
    anonymous_id = Column(String, nullable=True)
    user_id = Column(String, nullable=True)
    res_id = Column(String, ForeignKey("restaurants.id"), index=True)
    dish_id = Column(String, ForeignKey("dishes.id"), nullable=True)
    action_type = Column(String, nullable=False)
    duration_sec = Column(Integer, nullable=True)
    created_at = Column(String, nullable=True)
    interaction_metadata = Column("metadata", JSON, default={})


class ReviewModel(Base):
    __tablename__ = "reviews"

    id = Column(String, primary_key=True, index=True)
    res_id = Column(String, ForeignKey("restaurants.id"), index=True)
    reviewer_name = Column(String, nullable=True)
    rating = Column(Float, nullable=True)
    text = Column(String, nullable=True)
    date = Column(String, nullable=True)