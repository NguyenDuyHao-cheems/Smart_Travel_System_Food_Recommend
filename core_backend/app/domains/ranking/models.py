from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class RestaurantModel(Base):
    __tablename__ = "restaurants"
    id = Column(UUID(as_uuid=True), primary_key=True) 
    name = Column(String)
    lat = Column(Float)
    lng = Column(Float)
    price_range = Column(String) 
    is_active = Column(Boolean, default=True)
    embedding_vector = Column(Text)

class TagModel(Base):
    __tablename__ = "tags"
    id = Column(Integer, primary_key=True)
    name = Column(String)

class RestaurantTagModel(Base):
    __tablename__ = "res_tags"
    res_id = Column(UUID(as_uuid=True), ForeignKey("restaurants.id"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("tags.id"), primary_key=True)

class UserModel(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String)
    budget_limit = Column(Float)
    preferences_vector = Column(Text)
    
class DishModel(Base):
    __tablename__ = "dishes"
    id = Column(UUID(as_uuid=True), primary_key=True)
    res_id = Column(UUID(as_uuid=True), ForeignKey("restaurants.id"))
    name = Column(String)
    price = Column(Integer)
    image_url = Column(Text)
    embedding_vector = Column(Text) 
    is_active = Column(Boolean, default=True)