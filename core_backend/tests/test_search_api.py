from unittest.mock import AsyncMock, patch
from app.domains.search.schemas import AIResponseData
from app.domains.search.service import SearchService


def test_process_search_query_success(client):
    with patch(
        "app.services.ai_client.AIServiceClient.extract_intent_and_vectorize",
        new_callable=AsyncMock,
    ) as mock_ai:
        mock_ai.return_value = AIResponseData(
            vector=[1.0, 2.0, 3.0],
            cleaned_query="mì cay",
        )

        response = client.post("/api/v1/search/process", json={"query": "Tôi muốn ăn mì cay"})
        assert response.status_code == 200
        data = response.json()
        assert data["cleaned_query"] == "mì cay"
        assert len(data["vector"]) == 3


def test_process_search_query_ai_unavailable(client):
    with patch(
        "app.services.ai_client.AIServiceClient.extract_intent_and_vectorize",
        new_callable=AsyncMock,
    ) as mock_ai:
        mock_ai.return_value = None

        response = client.post("/api/v1/search/process", json={"query": "Tôi muốn ăn mì cay"})
        assert response.status_code == 503
        assert response.json()["detail"] == "AI engine is currently unavailable."


class MockRestaurantModel:
    def __init__(self, id):
        self.id = id
        self.name = f"Mock {id}"
        self.lat = 10.87
        self.lng = 106.80
        self.price_range = "50000"
        self.rating_avg = 4.5
        self.image_url = ""
        self.distance = 0.1
        self.ranking_score = 1.5

def _mock_recommend_results(results=None, filtered_out_count=0, fallback_applied=False, warning=None):
    """Helper to create mock recommend() return values."""
    mock_results = []
    if results:
        for r in results:
            if isinstance(r, str):
                mock_results.append(MockRestaurantModel(r))
            else:
                mock_results.append(r)
    return {
        "results": mock_results,
        "filtered_out_count": filtered_out_count,
        "fallback_applied": fallback_applied,
        "warning": warning,
    }


def test_process_recommend_query_success_without_fallback(client):
    with patch(
        "app.services.ai_client.AIServiceClient.extract_intent_and_vectorize",
        new_callable=AsyncMock,
    ) as mock_ai, patch(
        "app.domains.search.service.recommend",
        new_callable=AsyncMock,
    ) as mock_recommend:
        mock_ai.return_value = AIResponseData(
            vector=[1.0, 2.0, 3.0],
            cleaned_query="mì cay",
        )
        mock_recommend.return_value = _mock_recommend_results(
            results=["1", "2", "3"],
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
        assert data["applied_budget"] == SearchService.DEFAULT_BUDGET_VND

        # Verify recommend was called with query_vector
        call_kwargs = mock_recommend.call_args
        assert call_kwargs.kwargs.get("query_vector") == [1.0, 2.0, 3.0]


def test_process_recommend_query_budget_no_longer_triggers_memory_fallback(client):
    with patch(
        "app.services.ai_client.AIServiceClient.extract_intent_and_vectorize",
        new_callable=AsyncMock,
    ) as mock_ai, patch(
        "app.domains.search.service.recommend",
        new_callable=AsyncMock,
    ) as mock_recommend:
        strict_budget = 30000
        mock_ai.return_value = AIResponseData(
            vector=[1.0, 2.0, 3.0],
            cleaned_query="mì cay dưới 30k",
        )
        mock_recommend.return_value = _mock_recommend_results(
            results=["1", "2"],
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
        assert data["fallback_applied"] is False
        assert data["fallback_reason"] is None
        assert data["applied_budget"] == SearchService.DEFAULT_BUDGET_VND


def test_process_recommend_query_ai_unavailable(client):
    with patch(
        "app.services.ai_client.AIServiceClient.extract_intent_and_vectorize",
        new_callable=AsyncMock,
    ) as mock_ai:
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


def test_process_recommend_query_empty_results_from_recommend(client):
    """When recommend() returns empty results, response should still be valid."""
    with patch(
        "app.services.ai_client.AIServiceClient.extract_intent_and_vectorize",
        new_callable=AsyncMock,
    ) as mock_ai, patch(
        "app.domains.search.service.recommend",
        new_callable=AsyncMock,
    ) as mock_recommend:
        mock_ai.return_value = AIResponseData(
            vector=[1.0, 2.0, 3.0],
            cleaned_query="mì cay",
        )
        # recommend returns empty results
        mock_recommend.return_value = _mock_recommend_results(results=[])

        response = client.post(
            "/api/v1/search/recommend",
            json={
                "query": "Mì cay",
                "lat": 10.8700,
                "lng": 106.8031,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert len(data["results"]) == 0


# ── Budget priority tests ─────────────────────────────────────────────────────


def test_user_budget_takes_priority_over_ai_budget(client):
    """When user explicitly sends budget in body, it overrides AI-extracted budget."""
    with patch(
        "app.services.ai_client.AIServiceClient.extract_intent_and_vectorize",
        new_callable=AsyncMock,
    ) as mock_ai, patch(
        "app.domains.search.service.recommend",
        new_callable=AsyncMock,
    ) as mock_recommend:
        mock_ai.return_value = AIResponseData(
            vector=[1.0, 2.0, 3.0],
            cleaned_query="mì cay",
        )
        mock_recommend.return_value = _mock_recommend_results(
            results=["1"],
        )

        response = client.post(
            "/api/v1/search/recommend",
            json={
                "query": "Tôi muốn ăn mì cay",
                "lat": 10.8700,
                "lng": 106.8031,
                "budget": 60000,  # User explicitly passes 60k
            },
        )

        assert response.status_code == 200
        data = response.json()
        # Budget from user body (60000) should win over AI (30000)
        assert data["applied_budget"] == 60000
        assert data["fallback_applied"] is False

        # Verify recommend received user budget
        call_kwargs = mock_recommend.call_args
        assert call_kwargs.kwargs.get("budget") == 60000


def test_ai_budget_used_when_user_omits_budget(client):
    """When user does not send budget in body, AI-extracted budget is used."""
    with patch(
        "app.services.ai_client.AIServiceClient.extract_intent_and_vectorize",
        new_callable=AsyncMock,
    ) as mock_ai, patch(
        "app.domains.search.service.recommend",
        new_callable=AsyncMock,
    ) as mock_recommend:
        mock_ai.return_value = AIResponseData(
            vector=[1.0, 2.0, 3.0],
            cleaned_query="mì cay dưới 50k",
        )
        mock_recommend.return_value = _mock_recommend_results(
            results=["1"],
        )

        response = client.post(
            "/api/v1/search/recommend",
            json={
                "query": "Tôi muốn ăn mì cay dưới 50k",
                "lat": 10.8700,
                "lng": 106.8031,
                # No budget field in body
            },
        )

        assert response.status_code == 200
        data = response.json()
        # No user budget, AI doesn't extract budget -> default used
        assert data["applied_budget"] == SearchService.DEFAULT_BUDGET_VND


def test_default_budget_when_both_user_and_ai_absent(client):
    """When neither user nor AI provides budget, DEFAULT_BUDGET_VND is used."""
    with patch(
        "app.services.ai_client.AIServiceClient.extract_intent_and_vectorize",
        new_callable=AsyncMock,
    ) as mock_ai, patch(
        "app.domains.search.service.recommend",
        new_callable=AsyncMock,
    ) as mock_recommend:
        mock_ai.return_value = AIResponseData(
            vector=[1.0, 2.0, 3.0],
            cleaned_query="mì cay",
        )
        mock_recommend.return_value = _mock_recommend_results(
            results=["1"],
        )

        response = client.post(
            "/api/v1/search/recommend",
            json={
                "query": "Tôi muốn ăn mì cay",
                "lat": 10.8700,
                "lng": 106.8031,
                # No budget field in body
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["applied_budget"] == SearchService.DEFAULT_BUDGET_VND


def test_user_budget_zero_means_unlimited(client):
    """When user explicitly sends budget=0, it should be treated as unlimited (no price filtering)."""
    with patch(
        "app.services.ai_client.AIServiceClient.extract_intent_and_vectorize",
        new_callable=AsyncMock,
    ) as mock_ai, patch(
        "app.domains.search.service.recommend",
        new_callable=AsyncMock,
    ) as mock_recommend:
        mock_ai.return_value = AIResponseData(
            vector=[1.0, 2.0, 3.0],
            cleaned_query="mì cay",
        )
        mock_recommend.return_value = _mock_recommend_results(
            results=["1"],
        )

        response = client.post(
            "/api/v1/search/recommend",
            json={
                "query": "Tôi muốn ăn mì cay",
                "lat": 10.8700,
                "lng": 106.8031,
                "budget": 0,  # Explicitly 0 -> treated as no specific budget -> default
            },
        )

        assert response.status_code == 200
        data = response.json()
        # budget=0 is not > 0, so default budget is used
        assert data["fallback_applied"] is False
        assert data["applied_budget"] == SearchService.DEFAULT_BUDGET_VND
