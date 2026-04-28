from sqlalchemy import Column, String, Float, Boolean, ForeignKey, Integer, Text, Time
from sqlalchemy.orm import relationship
from app.core.database import Base
from pgvector.sqlalchemy import Vector


class RestaurantModel(Base):
    __tablename__ = "restaurants"

    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    address = Column(Text)
    lat = Column(Float)
    lng = Column(Float)
    price_range = Column(String)
    opening_hours = Column(String)
    image_url = Column(Text)
    rating_avg = Column(Float)
    sentiment_score = Column(Float)
    top_review_text = Column(Text)
    is_active = Column(Boolean)
    embedding_vector = Column(Vector(768), nullable=True)
    total_reviews = Column(Integer)
    open_time = Column(Time)
    close_time = Column(Time)
    timezone = Column(Text)
    is_open_now = Column(Boolean)
    google_maps_url = Column(Text)

    tags = relationship(
        "TagModel",
        secondary="res_tags",
        back_populates="restaurants",
    )


class TagModel(Base):
    __tablename__ = "tags"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)

    restaurants = relationship(
        "RestaurantModel",
        secondary="res_tags",
        back_populates="tags",
    )


class RestaurantTagModel(Base):
    __tablename__ = "res_tags"

    id = Column(String, primary_key=True, index=True)
    res_id = Column(String, ForeignKey("restaurants.id"), nullable=False)
    tag_id = Column(String, ForeignKey("tags.id"), nullable=False)
