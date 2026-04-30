from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from sqlalchemy.dialects.postgresql import ARRAY


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

    # Cột vector cho Cosine Similarity fallback
    vector = Column(ARRAY(Float), nullable=True)

    image_url = Column(String, nullable=True)
    opening_hours = Column(String, nullable=True)

    tags = relationship("TagModel", secondary="res_tags", back_populates="restaurants")


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
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    res_id = Column(String, ForeignKey("restaurants.id"), index=True)
    rating = Column(Float, nullable=True)