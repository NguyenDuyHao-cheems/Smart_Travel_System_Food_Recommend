import datetime
import uuid

from sqlalchemy import Column, String, Integer, Text, JSON, DateTime, event, DDL
from sqlalchemy.orm import DeclarativeBase
from pgvector.sqlalchemy import Vector
from sqlalchemy.ext.compiler import compiles


class Base(DeclarativeBase):
    pass

@compiles(Vector, "sqlite")
def compile_vector(type_, compiler, **kw):
    return "JSON"

def _create_extension(target, connection, **kw):
    if connection.dialect.name == "postgresql":
        connection.execute(DDL("CREATE EXTENSION IF NOT EXISTS vector"))

event.listen(Base.metadata, "before_create", _create_extension)

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
class UserAccount(Base):
    __tablename__ = "user_accounts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
