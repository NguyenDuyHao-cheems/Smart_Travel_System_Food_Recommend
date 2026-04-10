import pytest
from fastapi.testclient import TestClient
from typing import AsyncGenerator
from unittest.mock import AsyncMock

from app.main import app

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c
