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

@pytest.mark.asyncio
async def test_grpc_client_lazy_initialization():
    from app.services.grpc_client import GRPCServiceClient
    import asyncio
    
    client = GRPCServiceClient("localhost:50051")
    # Initially none of these are created
    assert client._channel is None
    assert client._stub is None
    assert client._loop is None
    
    # Access stub to trigger creation
    stub1 = client.stub
    assert client._channel is not None
    assert client._stub is not None
    assert client._loop is asyncio.get_running_loop()
    
    # Check that accessing again returns the same objects
    assert client.stub is stub1
    assert client.channel is client._channel
    
    # Clean up
    await client.close()

@pytest.mark.asyncio
async def test_grpc_client_recreates_on_new_loop():
    from app.services.grpc_client import GRPCServiceClient
    import asyncio
    
    client = GRPCServiceClient("localhost:50051")
    
    # Access on the current loop
    loop1 = asyncio.get_running_loop()
    stub1 = client.stub
    channel1 = client.channel
    assert client._loop is loop1
    
    # We simulate a new loop by manually setting the loop reference to a fake loop object
    fake_loop = object()
    client._loop = fake_loop
    
    # Access again, it should detect different loop and recreate
    stub2 = client.stub
    channel2 = client.channel
    assert client._loop is loop1  # It gets updated back to the active running loop
    assert stub2 is not stub1
    assert channel2 is not channel1
    
    await client.close()

