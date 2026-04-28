"""
conftest.py – shared pytest fixtures for all tests.

Sets up:
- A minimal FastAPI test client backed by an in-memory SQLite database.
- A factory function for valid OnboardingRequest payloads.
- Mock helpers for the AI engine HTTP call.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import os
from sqlalchemy import event
from sqlalchemy.engine import Engine

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if os.environ.get("DATABASE_URL", "").startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=OFF")
        cursor.close()


# Set dummy DATABASE_URL and SECRET_KEY before any imports from app
os.environ["DATABASE_URL"] = "sqlite:///./test_temp.db"

os.environ["SECRET_KEY"] = "test_secret_key_123"


import sys
import types

# ── Mock pgvector ─────────────────────────────────────────────────────────────
if "pgvector" not in sys.modules:
    pgvector_mock = types.ModuleType("pgvector")
    pgvector_sa_mock = types.ModuleType("pgvector.sqlalchemy")
    # Stub Vector class as a generic SQLAlchemy type for testing
    from sqlalchemy.types import JSON
    pgvector_sa_mock.Vector = JSON 
    sys.modules["pgvector"] = pgvector_mock
    sys.modules["pgvector.sqlalchemy"] = pgvector_sa_mock

from sqlalchemy import create_engine as real_create_engine

def mocked_create_engine(url, *args, **kwargs):
    if str(url).startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
    return real_create_engine(url, *args, **kwargs)

# Patch create_engine before any app imports
with patch("sqlalchemy.create_engine", side_effect=mocked_create_engine):
    from app.main import app
    from app.core.database import SessionLocal, engine as engine_test
    from app.domains.users.models import Base as UserBase, UserAccount, UserOnboarding


from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

# ── Database Session Setup ───────────────────────────────────────────────────
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)




@pytest.fixture(scope="session", autouse=True)
def create_test_tables():
    """Create all tables once for the entire test session."""
    UserBase.metadata.create_all(bind=engine_test)
    yield
    UserBase.metadata.drop_all(bind=engine_test)


@pytest.fixture()
def db_session():
    """Provide an isolated DB session per test; rolls back after each test."""
    connection = engine_test.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db_session):
    """Test client with the DB session overridden to use SQLite."""
    from app.core.database import SessionLocal as _SessionLocal
    from app.core.dependencies import get_db

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ── Payload factory ───────────────────────────────────────────────────────────

def make_payload(**overrides) -> dict:
    """Return a valid OnboardingRequest dict, optionally overriding fields."""
    base = {
        "favorite_dishes": ["Phở bò", "Bún chả", "Bánh mì"],
        "spicy_level": "medium",
        "dietary_restrictions": [],
        "allergies": [],
        "budget": "medium",
        "location": "Ho Chi Minh City",
        "age": 25,
    }
    base.update(overrides)
    return base


# ── AI engine mock helpers ─────────────────────────────────────────────────────

DUMMY_AI_VECTOR = [0.01] * 768


def mock_ai_ok():
    """Context manager that makes _call_ai_engine return a valid dummy vector."""
    return patch(
        "app.domains.users.service.OnboardingService._call_ai_engine",
        new_callable=AsyncMock,
        return_value=DUMMY_AI_VECTOR,
    )


def mock_ai_down():
    """Context manager that simulates AI engine being unreachable (returns None)."""
    return patch(
        "app.domains.users.service.OnboardingService._call_ai_engine",
        new_callable=AsyncMock,
        return_value=None,
    )
