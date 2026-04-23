from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
# Import Base từ file database.py trong core
from app.core.database import Base
from sqlalchemy.dialects.postgresql import ARRAY

class RestaurantModel(Base):
    __tablename__ = "restaurants"

    # Giữ đúng tên cột 'id' và 'lng' như trong ảnh ERD của Bảo
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    lat = Column(Float)
    lng = Column(Float)
    price_level = Column(Integer)
    is_open = Column(Boolean, default=True)

    # Cột vector cho Cosine Similarity fallback
    vector = Column(ARRAY(Float), nullable=True)

    # --- LambdaMART feature columns (nullable để tương thích DB cũ) ---
    rating = Column(Float, nullable=True)           # điểm đánh giá TB (0–5)
    sentiment_score = Column(Float, nullable=True)  # tổng hợp sentiment review (−1 đến 1)
    review_count = Column(Integer, nullable=True)   # tổng số lượt đánh giá

    # Thiết lập mối quan hệ với bảng tags thông qua bảng trung gian
    tags = relationship("TagModel", secondary="restaurant_tags", back_populates="restaurants")


class TagModel(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    tag_name = Column(String)

    restaurants = relationship("RestaurantModel", secondary="restaurant_tags", back_populates="tags")


class RestaurantTagModel(Base):
    __tablename__ = "restaurant_tags"

    # Bảng trung gian nối n-n giữa Restaurant và Tag
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("tags.id"), primary_key=True)

