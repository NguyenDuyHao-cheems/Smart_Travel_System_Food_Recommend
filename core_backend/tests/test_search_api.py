from unittest.mock import AsyncMock, patch


def test_process_search_query_success(client):
    with patch("app.services.ai_client.AIServiceClient.extract_intent_and_vectorize", new_callable=AsyncMock) as mock_ai:
        mock_ai.return_value = {
            "vector": [1.0, 2.0, 3.0],
            "budget": 50000,
            "intent": "Mì cay",
        }

        response = client.post("/api/v1/search/process", json={"query": "Tôi muốn ăn mì cay"})
        assert response.status_code == 200
        data = response.json()
        assert data["intent"] == "Mì cay"
        assert len(data["vector"]) == 3
        assert data["budget"] == 50000


def test_process_search_query_ai_unavailable(client):
    with patch("app.services.ai_client.AIServiceClient.extract_intent_and_vectorize", new_callable=AsyncMock) as mock_ai:
        mock_ai.return_value = None

        response = client.post("/api/v1/search/process", json={"query": "Tôi muốn ăn mì cay"})
        assert response.status_code == 503
        assert response.json()["detail"] == "AI engine is currently unavailable."


def test_process_recommend_query_success_without_fallback(client):
    with patch("app.services.ai_client.AIServiceClient.extract_intent_and_vectorize", new_callable=AsyncMock) as mock_ai:
        mock_ai.return_value = {
            "vector": [1.0, 2.0, 3.0],
            "budget": 50000,
            "intent": "Mì cay",
        }

        response = client.post(
            "/api/v1/search/recommend",
            json={
                "query": "Tôi muốn ăn mì cay",
                "lat": 10.8700,
                "lng": 106.8031,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert len(data["results"]) >= 1
        assert data["fallback_applied"] is False
        assert data["applied_radius_km"] == 2.0
        assert data["applied_budget"] == 50000


def test_process_recommend_query_fallback_when_filters_too_strict(client):
    with patch("app.services.ai_client.AIServiceClient.extract_intent_and_vectorize", new_callable=AsyncMock) as mock_ai:
        mock_ai.return_value = {
            "vector": [1.0, 2.0, 3.0],
            "budget": 30000,
            "intent": "Mì cay",
        }

        response = client.post(
            "/api/v1/search/recommend",
            json={
                "query": "Tôi muốn ăn mì cay dưới 30k",
                "lat": 10.8700,
                "lng": 106.8031,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert len(data["results"]) >= 1
        assert data["fallback_applied"] is True
        assert data["fallback_reason"] is not None
        assert data["applied_radius_km"] == 5.0
        assert data["applied_budget"] == 60000
