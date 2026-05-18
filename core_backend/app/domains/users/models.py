from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Integer, JSON, DateTime, event, DDL, ForeignKey, Boolean
from app.core.database import Base
from pgvector.sqlalchemy import Vector
from sqlalchemy.ext.compiler import compiles
from app.core.config import settings


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

    user_id = Column(String, ForeignKey("users.id"), primary_key=True, index=True)
    favorite_dishes = Column(JSON, nullable=False)
    spicy_level = Column(String, nullable=False)
    dietary_restrictions = Column(JSON, nullable=True)
    allergies = Column(JSON, nullable=True)
    budget = Column(String, nullable=False)
    location = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    is_vegetarian = Column(Boolean, default=False)
    preferences_vector = Column(Vector(settings.VECTOR_DIM), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class UserAccount(Base):
    """
    Stores account credentials used for sign up and sign in.

    Columns
    -------
    id                 – UUID string identifier of the user.
    username           – unique username used for authentication.
    password_hash      – hashed password.
    preferences_vector – long-term profile vector (768-dim) compiled from
                         onboarding prefs, bookmarks, liked items, interactions.
    allergies          – JSON list of allergen tags.
    created_at         – UTC timestamp of when the account was created.
    updated_at         – UTC timestamp of the last profile update.
    """

    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    preferences_vector = Column(Vector(settings.VECTOR_DIM), nullable=True)
    allergies = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

class UserInteraction(Base):
    __tablename__ = "user_interactions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    anonymous_id = Column(String, nullable=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    res_id = Column(String, nullable=True, index=True)
    action_type = Column(String, nullable=False, index=True)
    duration_sec = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    metadata_ = Column("metadata", JSON, nullable=True)
    search_session_id = Column(String, nullable=True, index=True)


class UserFavorite(Base):
    """
    Stores restaurant bookmarks (favorites) by users.
    """
    __tablename__ = "user_favorites"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    res_id = Column(String, ForeignKey("restaurants.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class UserCollection(Base):
    """
    Groups items into user-defined collections.
    """
    __tablename__ = "user_collections"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                         onupdate=lambda: datetime.now(timezone.utc))


class UserCollectionItem(Base):
    """
    Stores individual items contained within a UserCollection.
    """
    __tablename__ = "user_collection_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    collection_id = Column(String, ForeignKey("user_collections.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    res_id = Column(String, ForeignKey("restaurants.id"), nullable=True, index=True)
    dish_id = Column(String, nullable=True, index=True)
    item_type = Column(String, nullable=True)
    note = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

