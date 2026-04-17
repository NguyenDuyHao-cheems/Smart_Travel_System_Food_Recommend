import pytest
from unittest.mock import AsyncMock, patch

def test_process_search_query_success(client):
    # Mocking the AIServiceClient's method
    with patch("app.services.ai_client.AIServiceClient.extract_intent_and_vectorize", new_callable=AsyncMock) as mock_ai:
        mock_ai.return_value = {
            "vector": [1.0, 2.0, 3.0],
            "extracted_budget": 50.0,
            "intent": "Mì cay"
        }
        
        response = client.post("/api/v1/search/process", json={"query": "Tôi muốn ăn mì cay"})
        assert response.status_code == 200
        data = response.json()
        assert data["intent"] == "Mì cay"
        assert len(data["vector"]) == 3
        assert data["extracted_budget"] == 50.0

def test_process_search_query_ai_unavailable(client):
    with patch("app.services.ai_client.AIServiceClient.extract_intent_and_vectorize", new_callable=AsyncMock) as mock_ai:
        mock_ai.return_value = None
        
        response = client.post("/api/v1/search/process", json={"query": "Tôi muốn ăn mì cay"})
        assert response.status_code == 503
        assert response.json()["detail"] == "AI engine is currently unavailable."

def test_process_recommend_query_success(client):
    response = client.post("/api/v1/search/recommend", json={
        "query": "Tôi muốn ăn mì cay",
        "lat": 10.8700,
        "lng": 106.8031
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert len(data["results"]) == 5
    first_result = data["results"][0]
    assert first_result["id"] == 1
    assert "Mì Cay Sasin" in first_result["name"]
