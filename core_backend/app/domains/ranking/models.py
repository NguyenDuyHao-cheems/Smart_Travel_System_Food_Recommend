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
    
    # Cột này Bảo tự thêm vào Postgres (kiểu float8[]) để chạy Ranking
    # Nếu trong DB chưa có, bạn nhớ thêm cột này vào bảng restaurants nhé
    vector = Column(ARRAY(Float), nullable=True)

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

