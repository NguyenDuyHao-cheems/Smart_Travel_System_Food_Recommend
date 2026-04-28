from unittest.mock import AsyncMock, patch
from app.domains.search.schemas import AIResponseData
from app.domains.search.service import SearchService


def test_process_search_query_success(client):
    with patch("app.services.ai_client.AIServiceClient.extract_intent_and_vectorize", new_callable=AsyncMock) as mock_ai:
        mock_ai.return_value = AIResponseData(
            vector=[1.0, 2.0, 3.0],
            budget=50000,
            intent="Mì cay",
        )

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
        mock_ai.return_value = AIResponseData(
            vector=[1.0, 2.0, 3.0],
            budget=50000,
            intent="Mì cay",
        )

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
        assert data["applied_radius_km"] == SearchService.DEFAULT_RADIUS_KM
        assert data["applied_budget"] == 50000


def test_process_recommend_query_fallback_when_filters_too_strict(client):
    with patch("app.services.ai_client.AIServiceClient.extract_intent_and_vectorize", new_callable=AsyncMock) as mock_ai:
        strict_budget = 30000
        mock_ai.return_value = AIResponseData(
            vector=[1.0, 2.0, 3.0],
            budget=strict_budget,
            intent="Mì cay",
        )

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
        assert data["applied_radius_km"] == SearchService.FALLBACK_RADIUS_KM
        assert data["applied_budget"] == strict_budget + SearchService.FALLBACK_BUDGET_DELTA_VND


def test_process_recommend_query_ai_unavailable(client):
    with patch("app.services.ai_client.AIServiceClient.extract_intent_and_vectorize", new_callable=AsyncMock) as mock_ai:
        mock_ai.return_value = None

        response = client.post(
            "/api/v1/search/recommend",
            json={
                "query": "Tôi muốn ăn mì cay",
                "lat": 10.8700,
                "lng": 106.8031,
            },
        )
        assert response.status_code == 503
        assert response.json()["detail"] == "AI engine is currently unavailable."


def test_process_recommend_query_nearest_fallback(client):
    with patch("app.services.ai_client.AIServiceClient.extract_intent_and_vectorize", new_callable=AsyncMock) as mock_ai:
        # Budget so low that even relaxed (5k + 30k = 35k) won't match anything (min mock is 40k)
        mock_ai.return_value = AIResponseData(
            vector=[1.0, 2.0, 3.0],
            budget=5000,
            intent="Mì cay",
        )

        response = client.post(
            "/api/v1/search/recommend",
            json={
                "query": "Mì cay 5k",
                "lat": 10.8700,
                "lng": 106.8031,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert len(data["results"]) == 5  # Returns top 5 nearest
        assert data["fallback_applied"] is True
        assert "nearest" in data["fallback_reason"].lower()
        assert data["applied_budget"] is None
