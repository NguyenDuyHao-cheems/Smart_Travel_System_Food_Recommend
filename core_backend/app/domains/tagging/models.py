from sqlalchemy import Column, String, Float, Text, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from pgvector.sqlalchemy import Vector
from app.core.database import Base


class DishModel(Base):
    __tablename__ = "dishes"

    id = Column(String, primary_key=True, index=True)
    res_id = Column(String, ForeignKey("restaurants.id"), nullable=False)
    name = Column(String)
    price = Column(Float)
    image_url = Column(Text)
    ingredients = Column(JSONB)
    allergens = Column(JSONB)
    is_vegetarian = Column(Boolean)
    embedding_vector = Column(Vector(768), nullable=True)


class ReviewModel(Base):
    __tablename__ = "reviews"

    id = Column(String, primary_key=True, index=True)
    res_id = Column(String, ForeignKey("restaurants.id"), nullable=False)
    reviewer_name = Column(String)
    rating = Column(Float)
    text = Column(Text)
    date = Column(String)
