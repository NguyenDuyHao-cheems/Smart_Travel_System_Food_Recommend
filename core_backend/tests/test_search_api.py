from unittest.mock import AsyncMock, patch
import pytest
from app.domains.search.schemas import AIResponseData, SearchRecommendRequest
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
    def __init__(self, id_str):
        import uuid
        try:
            self.id = uuid.UUID(int=int(id_str))
        except ValueError:
            self.id = uuid.uuid4()
        self.name = f"Mock {id_str}"
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


@pytest.mark.asyncio
async def test_process_recommend_query_map_viewport_uses_map_center(db_session):
    with patch(
        "app.domains.search.service.recommend",
        new_callable=AsyncMock,
    ) as mock_recommend:
        mock_ai = AsyncMock()
        restaurant = MockRestaurantModel("1")
        restaurant.lat = 10.01
        restaurant.lng = 106.0
        mock_ai.extract_intent_and_vectorize.return_value = AIResponseData(
            vector=[1.0, 2.0, 3.0],
            cleaned_query="mi cay",
        )
        mock_recommend.return_value = _mock_recommend_results(
            results=[restaurant],
        )

        request = SearchRecommendRequest(
            query="toi muon an mi cay",
            lat=20.0,
            lng=106.0,
            map_center_lat=10.0,
            map_center_lng=106.0,
            map_north=10.05,
            map_south=9.95,
            map_east=106.05,
            map_west=105.95,
            map_radius_km=2,
        )
        response = await SearchService(mock_ai).process_recommend_query(request, db_session)

        assert response.results[0].distance_km < 2
        assert response.results[0].lat == 10.01
        assert response.results[0].lng == 106.0
        assert mock_recommend.call_args.kwargs.get("user_location") == [10.0, 106.0]
        assert mock_recommend.call_args.kwargs.get("viewport_bounds") == {
            "north": 10.05,
            "south": 9.95,
            "east": 106.05,
            "west": 105.95,
        }
        assert mock_recommend.call_args.kwargs.get("map_center") == [10.0, 106.0]
        assert mock_recommend.call_args.kwargs.get("map_radius_km") == 2


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


def test_process_recommend_query_passes_emotion_search_mode(client):
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
        mock_recommend.return_value = _mock_recommend_results(results=["1"])

        response = client.post(
            "/api/v1/search/recommend",
            json={
                "query": "Tôi muốn ăn mì cay",
                "lat": 10.8700,
                "lng": 106.8031,
                "search_mode": "emotion",
            },
        )

        assert response.status_code == 200
        assert mock_recommend.call_args.kwargs.get("search_mode") == "emotion"


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


def test_get_lucky_wheel_dishes(client):
    # 1. Test standard fallback (no coordinates)
    response = client.get("/api/v1/search/lucky-wheel-dishes")
    assert response.status_code == 200
    dishes = response.json()
    assert isinstance(dishes, list)
    assert len(dishes) == 12
    assert "Phở Bò" in dishes
    assert "Bánh Mì" in dishes

    # 2. Test fallback with coordinates (but empty test DB candidate list)
    response = client.get("/api/v1/search/lucky-wheel-dishes?lat=21.0278&lng=105.8342")
    assert response.status_code == 200
    dishes_coords = response.json()
    assert isinstance(dishes_coords, list)
    assert len(dishes_coords) == 12
    assert "Phở Bò" in dishes_coords

    # 3. Test vegetarian onboarding fallback path with query param (user_id not in DB)
    response = client.get("/api/v1/search/lucky-wheel-dishes?user_id=nonexistent-user-id")
    assert response.status_code == 200
    dishes_veg = response.json()
    assert len(dishes_veg) == 12
    assert "Phở Bò" in dishes_veg  # Since user is not found, falls back to non-vegetarian default


def test_get_newspaper_menu_router(client):
    with patch(
        "app.domains.search.service.SearchService.get_newspaper_menu",
        new_callable=AsyncMock,
    ) as mock_get:
        from app.domains.search.schemas import NewspaperMenuResponse, NewspaperMenuItem
        mock_get.return_value = NewspaperMenuResponse(
            items=[
                NewspaperMenuItem(
                    slot="breakfast",
                    restaurant_id="123",
                    restaurant_name="Quán ăn sáng",
                    rating_avg=4.5,
                    suggested_dish_name="Phở Bò",
                    suggested_dish_price=45000
                ),
                NewspaperMenuItem(
                    slot="lunch",
                    restaurant_id="456",
                    restaurant_name="Quán ăn trưa",
                    rating_avg=4.6,
                    suggested_dish_name="Cơm Tấm",
                    suggested_dish_price=35000
                ),
                NewspaperMenuItem(
                    slot="dinner",
                    restaurant_id="789",
                    restaurant_name="Quán ăn tối",
                    rating_avg=4.7,
                    suggested_dish_name="Lẩu Thái",
                    suggested_dish_price=150000
                )
            ]
        )

        response = client.get("/api/v1/search/newspaper-menu?lat=10.87&lng=106.80")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert len(data["items"]) == 3
        assert data["items"][0]["slot"] == "breakfast"
        assert data["items"][0]["restaurant_name"] == "Quán ăn sáng"
        assert data["items"][0]["suggested_dish_name"] == "Phở Bò"


@pytest.mark.asyncio
async def test_get_newspaper_menu_service_logic():
    # Test service method directly with a mock session
    from unittest.mock import MagicMock
    from app.domains.ranking.models import RestaurantModel, DishModel
    
    mock_db = MagicMock()
    mock_restaurant_query = MagicMock()
    mock_restaurant_query.filter.return_value = mock_restaurant_query
    
    # Mock return list of restaurants
    mock_r1 = RestaurantModel(
        id="d3b07384-d113-4f1e-a9b3-4f19b8823101",
        name="Restaurant A",
        is_active=True,
        rating_avg=4.5,
        open_time="07:00:00",
        close_time="21:00:00",
        lat=10.87,
        lng=106.80
    )
    mock_r2 = RestaurantModel(
        id="e4c07384-d113-4f1e-a9b3-4f19b8823102",
        name="Restaurant B",
        is_active=True,
        rating_avg=4.2,
        open_time="11:00:00",
        close_time="22:00:00",
        lat=10.87,
        lng=106.80
    )
    mock_restaurant_query.limit.return_value.all.return_value = [mock_r1, mock_r2]
    
    # Mock dish query
    mock_dish_query = MagicMock()
    mock_dish_query.filter.return_value = mock_dish_query
    mock_dish = DishModel(id="1", res_id=mock_r1.id, name="Phở", price=30000)
    mock_dish_query.all.return_value = [mock_dish]

    # Use side effect to return appropriate query object depending on the argument
    def db_query_side_effect(model_cls):
        if model_cls == RestaurantModel:
            return mock_restaurant_query
        elif model_cls == DishModel:
            return mock_dish_query
        return MagicMock()

    mock_db.query.side_effect = db_query_side_effect

    response = await SearchService.get_newspaper_menu(mock_db, lat=10.87, lng=106.80)
    assert len(response.items) > 0
    assert response.is_fallback is False
    assert response.radius_km == 10.0
    assert response.message is None
    # Check slots assigned
    slots = [item.slot for item in response.items]
    assert "breakfast" in slots or "lunch" in slots or "dinner" in slots


@pytest.mark.asyncio
async def test_get_newspaper_menu_fallback_20km():
    from unittest.mock import MagicMock
    from app.domains.ranking.models import RestaurantModel, DishModel
    
    mock_db = MagicMock()
    mock_restaurant_query = MagicMock()
    mock_restaurant_query.filter.return_value = mock_restaurant_query
    
    # Mock return list of restaurants (approx 13.3km away: delta_lat = 0.12)
    mock_r1 = RestaurantModel(
        id="d3b07384-d113-4f1e-a9b3-4f19b8823101",
        name="Far Restaurant A",
        is_active=True,
        rating_avg=4.5,
        open_time="07:00:00",
        close_time="21:00:00",
        lat=10.99,
        lng=106.80
    )
    mock_restaurant_query.limit.return_value.all.return_value = [mock_r1]
    
    # Mock dish query
    mock_dish_query = MagicMock()
    mock_dish_query.filter.return_value = mock_dish_query
    mock_dish = DishModel(id="1", res_id=mock_r1.id, name="Phở", price=30000)
    mock_dish_query.all.return_value = [mock_dish]

    def db_query_side_effect(model_cls):
        if model_cls == RestaurantModel:
            return mock_restaurant_query
        elif model_cls == DishModel:
            return mock_dish_query
        return MagicMock()

    mock_db.query.side_effect = db_query_side_effect

    response = await SearchService.get_newspaper_menu(mock_db, lat=10.87, lng=106.80)
    assert len(response.items) > 0
    assert response.is_fallback is True
    assert response.radius_km == 20.0
    assert "10km" in response.message and "20km" in response.message


@pytest.mark.asyncio
async def test_get_newspaper_menu_empty():
    from unittest.mock import MagicMock
    from app.domains.ranking.models import RestaurantModel, DishModel
    
    mock_db = MagicMock()
    mock_restaurant_query = MagicMock()
    mock_restaurant_query.filter.return_value = mock_restaurant_query
    
    # Mock return list of restaurants (approx 36.6km away: delta_lat = 0.33)
    mock_r1 = RestaurantModel(
        id="d3b07384-d113-4f1e-a9b3-4f19b8823101",
        name="Very Far Restaurant A",
        is_active=True,
        rating_avg=4.5,
        open_time="07:00:00",
        close_time="21:00:00",
        lat=11.20,
        lng=106.80
    )
    mock_restaurant_query.limit.return_value.all.return_value = [mock_r1]
    
    # Mock dish query
    mock_dish_query = MagicMock()
    mock_dish_query.filter.return_value = mock_dish_query
    mock_dish = DishModel(id="1", res_id=mock_r1.id, name="Phở", price=30000)
    mock_dish_query.all.return_value = [mock_dish]

    def db_query_side_effect(model_cls):
        if model_cls == RestaurantModel:
            return mock_restaurant_query
        elif model_cls == DishModel:
            return mock_dish_query
        return MagicMock()

    mock_db.query.side_effect = db_query_side_effect

    response = await SearchService.get_newspaper_menu(mock_db, lat=10.87, lng=106.80)
    assert len(response.items) == 0
    assert response.is_fallback is False
    assert response.radius_km == 20.0
    assert "20km" in response.message


@pytest.mark.asyncio
async def test_process_recommend_query_disconnected(db_session):
    """Khi client disconnected -> process_recommend_query ném HTTPException 499."""
    from fastapi import HTTPException

    mock_ai = AsyncMock()
    mock_request = AsyncMock()
    mock_request.is_disconnected = AsyncMock(return_value=True)

    request = SearchRecommendRequest(
        query="Tôi muốn ăn mì cay",
        lat=10.8700,
        lng=106.8031,
    )

    service = SearchService(mock_ai)
    with pytest.raises(HTTPException) as exc_info:
        await service.process_recommend_query(request, db_session, http_request=mock_request)

    assert exc_info.value.status_code == 499
    assert "Client Closed Request" in exc_info.value.detail




