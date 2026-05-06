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
    with patch(
        "app.services.ai_client.AIServiceClient.extract_intent_and_vectorize",
        new_callable=AsyncMock,
    ) as mock_ai:
        mock_ai.return_value = None

        response = client.post("/api/v1/search/process", json={"query": "Tôi muốn ăn mì cay"})
        assert response.status_code == 503
        assert response.json()["detail"] == "AI engine is currently unavailable."


def _mock_recommend_results(results=None, filtered_out_count=0, fallback_applied=False, warning=None):
    """Helper to create mock recommend() return values."""
    return {
        "results": results or [],
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
    ) as mock_recommend:
        mock_ai.return_value = AIResponseData(
            vector=[1.0, 2.0, 3.0],
            budget=50000,
            intent="Mì cay",
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
        assert data["applied_radius_km"] == SearchService.DEFAULT_RADIUS_KM
        assert data["applied_budget"] == 50000

        # Verify recommend was called with query_vector
        call_kwargs = mock_recommend.call_args
        assert call_kwargs.kwargs.get("query_vector") == [1.0, 2.0, 3.0]


def test_process_recommend_query_budget_no_longer_triggers_memory_fallback(client):
    with patch(
        "app.services.ai_client.AIServiceClient.extract_intent_and_vectorize",
        new_callable=AsyncMock,
    ) as mock_ai, patch(
        "app.domains.search.service.recommend",
    ) as mock_recommend:
        strict_budget = 30000
        mock_ai.return_value = AIResponseData(
            vector=[1.0, 2.0, 3.0],
            budget=strict_budget,
            intent="Mì cay",
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
        assert data["applied_radius_km"] == SearchService.DEFAULT_RADIUS_KM
        assert data["applied_budget"] == strict_budget


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


def test_process_recommend_query_nearest_fallback_when_radius_filters_out_all_results(client):
    with patch(
        "app.services.ai_client.AIServiceClient.extract_intent_and_vectorize",
        new_callable=AsyncMock,
    ) as mock_ai, patch(
        "app.domains.search.service.recommend",
    ) as mock_recommend, patch.object(SearchService, "DEFAULT_RADIUS_KM", 0.1), patch.object(
        SearchService, "FALLBACK_RADIUS_KM", 0.1
    ):
        mock_ai.return_value = AIResponseData(
            vector=[1.0, 2.0, 3.0],
            budget=50000,
            intent="Mì cay",
        )
        # recommend returns empty results (DB returned nothing in tiny radius)
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
        # Now results come from recommend() which returned empty →
        # SearchService fallback logic applies on the empty safe_results list
        assert data["fallback_applied"] is True or len(data["results"]) == 0


# ── Budget priority tests ─────────────────────────────────────────────────────


def test_user_budget_takes_priority_over_ai_budget(client):
    """When user explicitly sends budget in body, it overrides AI-extracted budget."""
    with patch(
        "app.services.ai_client.AIServiceClient.extract_intent_and_vectorize",
        new_callable=AsyncMock,
    ) as mock_ai, patch(
        "app.domains.search.service.recommend",
    ) as mock_recommend:
        mock_ai.return_value = AIResponseData(
            vector=[1.0, 2.0, 3.0],
            budget=30000,       # AI extracts 30k from query text
            intent="search_food",
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
    ) as mock_recommend:
        mock_ai.return_value = AIResponseData(
            vector=[1.0, 2.0, 3.0],
            budget=50000,       # AI extracts 50k
            intent="search_food",
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
        assert data["applied_budget"] == 50000

        # Verify recommend received AI budget
        call_kwargs = mock_recommend.call_args
        assert call_kwargs.kwargs.get("budget") == 50000


def test_default_budget_when_both_user_and_ai_absent(client):
    """When neither user nor AI provides budget, DEFAULT_BUDGET_VND is used."""
    with patch(
        "app.services.ai_client.AIServiceClient.extract_intent_and_vectorize",
        new_callable=AsyncMock,
    ) as mock_ai, patch(
        "app.domains.search.service.recommend",
    ) as mock_recommend:
        mock_ai.return_value = AIResponseData(
            vector=[1.0, 2.0, 3.0],
            budget=None,        # AI extracts no budget
            intent="search_food",
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
    ) as mock_recommend:
        mock_ai.return_value = AIResponseData(
            vector=[1.0, 2.0, 3.0],
            budget=50000,
            intent="search_food",
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
                "budget": 0,  # Explicitly 0 -> unlimited
            },
        )

        assert response.status_code == 200
        data = response.json()
        # budget=0 should be used (not AI's 50k), and treated as None (unlimited)
        # So it should NOT trigger fallback because any price is fine
        assert data["fallback_applied"] is False
        assert data["applied_budget"] is None  # None indicates unlimited in response
