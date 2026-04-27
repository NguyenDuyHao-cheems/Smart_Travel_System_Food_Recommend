from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey
from app.core.database import Base

class RestaurantModel(Base):
    __tablename__ = "restaurants"

    id = Column(String, primary_key=True) # UUID trong ảnh, để String/UUID đều được
    name = Column(String)
    address = Column(String)
    lat = Column(Float)
    lng = Column(Float)
    price_range = Column(Integer)
    
    # Khớp đúng ảnh ERD của Bảo:
    rating_avg = Column(Float)            # Ảnh ghi rating_avg
    sentiment_score = Column(Float)
    total_reviews = Column(Integer)       # Ảnh ghi total_reviews thay vì review_count
    is_active = Column(Boolean)           # Ảnh ghi is_active
    is_open_now = Column(Boolean)         # Ảnh có cột này nữa nè
    
    # Các cột khác nếu Bảo muốn dùng
    image_url = Column(String)
    opening_hours = Column(String)

class TagModel(Base):
    __tablename__ = "tags"
    id = Column(Integer, primary_key=True)
    name = Column(String)

class RestaurantTagModel(Base):
    __tablename__ = "res_tags"
    res_id = Column(String, ForeignKey("restaurants.id"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("tags.id"), primary_key=True)