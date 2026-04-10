from sqlalchemy import Column, String, Integer, Text, JSON, DateTime, event, DDL
from sqlalchemy.orm import DeclarativeBase
from pgvector.sqlalchemy import Vector
import datetime


class Base(DeclarativeBase):
    pass

event.listen(Base.metadata, "before_create", DDL("CREATE EXTENSION IF NOT EXISTS vector"))


class UserOnboarding(Base):
    """
    Persists the result of a user's onboarding session.

    Columns
    -------
    user_id              – external identifier provided by the caller.
    favorite_dishes      – JSON list of dish names.
    spicy_level          – chosen spice tier.
    dietary_restrictions – JSON list of restriction tags.
    allergies            – JSON list of allergen tags.
    budget               – budget tier (low / medium / high).
    location             – user's city or district.
    age                  – user's age.
    preferences_vector   – JSON-encoded float list produced by the AI engine.
    created_at           – UTC timestamp of when the record was created.
    """

    __tablename__ = "user_onboardings"

    user_id = Column(String, primary_key=True, index=True)
    favorite_dishes = Column(JSON, nullable=False)
    spicy_level = Column(String, nullable=False)
    dietary_restrictions = Column(JSON, nullable=True)
    allergies = Column(JSON, nullable=True)
    budget = Column(String, nullable=False)
    location = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    preferences_vector = Column(Vector(773), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
