import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.ai_client import embed_text
from app.core.config import settings

@pytest.mark.asyncio
async def test_embed_text_success():
    dummy_vector = [0.1] * 768
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"vector": dummy_vector}
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
        vector = await embed_text("some text")
        assert vector == dummy_vector
        assert len(vector) == 768

@pytest.mark.asyncio
async def test_embed_text_dim_mismatch():
    bad_vector = [0.1] * 100
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"vector": bad_vector}
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
        vector = await embed_text("some text")
        assert vector is None

@pytest.mark.asyncio
async def test_embed_text_engine_down():
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, side_effect=Exception("Connection error")):
        vector = await embed_text("some text")
        assert vector is None

@pytest.mark.asyncio
async def test_embed_text_empty_input():
    vector = await embed_text("  ")
    assert vector is None
