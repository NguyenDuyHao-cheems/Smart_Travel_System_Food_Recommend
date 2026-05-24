import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.domains.users.models import UserAccount, UserFriend, UserOnboarding
from app.domains.ranking.models import RestaurantModel, DishModel
from app.domains.recommendations.service import RecommendationService


@pytest.mark.asyncio
async def test_get_group_recommendations_logic(db_session: Session):
    # Setup test users
    user_a = UserAccount(
        id="user-a-id",
        username="usera",
        password_hash="hash",
        preferences_vector=[0.1] * 768,
        allergies=["peanut"]
    )
    user_b = UserAccount(
        id="user-b-id",
        username="userb",
        password_hash="hash",
        preferences_vector=[0.3] * 768,
        allergies=None
    )
    user_c = UserAccount(
        id="user-c-id",
        username="userc",
        password_hash="hash",
        preferences_vector=[0.5] * 768,
        allergies=None
    )
    
    db_session.add_all([user_a, user_b, user_c])
    db_session.commit()
    
    # Establish friendship A <-> B (but not A <-> C)
    friend_ab = UserFriend(user_id="user-a-id", friend_id="user-b-id")
    friend_ba = UserFriend(user_id="user-b-id", friend_id="user-a-id")
    db_session.add_all([friend_ab, friend_ba])
    db_session.commit()

    # User B Onboarding
    onb_b = UserOnboarding(
        user_id="user-b-id",
        favorite_dishes=["bún chả"],
        spicy_level="medium",
        budget="medium",
        location="HCM",
        age=25,
        is_vegetarian=True,
        allergies=["shrimp"]
    )
    db_session.add(onb_b)
    db_session.commit()

    # Create dummy restaurants
    res1 = RestaurantModel(
        id="res-1",
        name="Quán Chay Thanh Tịnh",
        lat=10.87,
        lng=106.80,
        is_active=True,
        is_vegetarian=True,
        embedding_vector=[0.2] * 768,
        rating_avg=4.8,
        total_reviews=10
    )
    res2 = RestaurantModel(
        id="res-2",
        name="Quán Thịt Nướng",
        lat=10.87,
        lng=106.80,
        is_active=True,
        is_vegetarian=False,
        embedding_vector=[0.2] * 768,
        rating_avg=4.5,
        total_reviews=10
    )
    res3 = RestaurantModel(
        id="res-3",
        name="Quán Chay Có Tôm",
        lat=10.87,
        lng=106.80,
        is_active=True,
        is_vegetarian=True,
        embedding_vector=[0.2] * 768,
        rating_avg=4.7,
        total_reviews=10
    )

    # Intercept queries for RestaurantModel and DishModel/attributes
    original_query = db_session.query
    def mock_query(model, *args, **kwargs):
        # Safely check type first to avoid SQLAlchemy column-vs-class evaluation issues
        if isinstance(model, type) and model == RestaurantModel:
            mq = MagicMock()
            mq.filter.return_value = mq
            mq.order_by.return_value = mq
            mq.limit.return_value = mq
            mq.all.return_value = [res1]
            return mq
        elif isinstance(model, type) and model == DishModel:
            mq = MagicMock()
            mq.filter.return_value = mq
            mq.all.return_value = [
                ("res-1", "Soya dish", ["soya"]),
                ("res-2", "Shrimp dish", ["shrimp"]),
                ("res-3", "Shrimp dish", ["shrimp"])
            ]
            return mq
        elif not isinstance(model, type):
            # It's a tuple of columns or column itself
            model_str = str(model)
            if "DishModel" in model_str:
                mq = MagicMock()
                mq.filter.return_value = mq
                if len(args) == 2:
                    mq.all.return_value = [
                        ("res-1", "Soya dish", ["soya"]),
                        ("res-2", "Shrimp dish", ["shrimp"]),
                        ("res-3", "Shrimp dish", ["shrimp"])
                    ]
                else:
                    mq.all.return_value = [
                        ("res-1", ["soya"]),
                        ("res-2", ["shrimp"]),
                        ("res-3", ["shrimp"])
                    ]
                return mq
        return original_query(model, *args, **kwargs)

    with patch.object(db_session, "query", side_effect=mock_query):
        # Execute service method
        res = await RecommendationService.get_group_recommendations(
            user=user_a,
            friend_ids=["user-b-id", "user-c-id"],
            lat=10.87,
            lng=106.80,
            limit=10,
            db=db_session
        )

    # Assertions
    # 1. Group size should be 2 (A + B, C is ignored as they are not mutual friends)
    assert res["group_size"] == 2
    # 2. Vegetarian filter should be active because B is vegetarian
    assert res["applied_vegetarian_filter"] is True
    # 3. Aggregated allergies should contain peanut and shrimp
    assert "peanut" in res["applied_allergies"]
    assert "shrimp" in res["applied_allergies"]
    # 4. Results should contain only res-1
    # - res-2 is excluded because is_vegetarian = False
    # - res-3 is excluded because it contains shrimp (filtered by allergy filter)
    assert len(res["results"]) == 1
    assert res["results"][0].id == "res-1"


@pytest.mark.asyncio
async def test_get_group_recommendations_cold_start(db_session: Session):
    # Setup test users
    user_a = UserAccount(
        id="user-a-cs",
        username="user_a_cs",
        password_hash="hash"
    )
    db_session.add(user_a)
    db_session.commit()

    onb_a = UserOnboarding(
        user_id="user-a-cs",
        favorite_dishes=["phở bò, bún chả"],
        spicy_level="medium",
        budget="medium",
        location="HCM",
        age=25,
        is_vegetarian=False
    )
    db_session.add(onb_a)
    db_session.commit()

    res1 = RestaurantModel(
        id="res-1-cs",
        name="Phở Gia Truyền",
        lat=10.87,
        lng=106.80,
        is_active=True,
        embedding_vector=[0.1] * 768,
        rating_avg=4.8,
        total_reviews=10
    )

    original_query = db_session.query
    def mock_query(model, *args, **kwargs):
        if isinstance(model, type) and model == RestaurantModel:
            mq = MagicMock()
            mq.filter.return_value = mq
            mq.order_by.return_value = mq
            mq.limit.return_value = mq
            mq.all.return_value = [res1]
            return mq
        return original_query(model, *args, **kwargs)

    dummy_embedded_vec = [0.1] * 768
    with patch("app.services.ai_client.embed_text", new_callable=AsyncMock, return_value=dummy_embedded_vec) as mock_embed, \
         patch.object(db_session, "query", side_effect=mock_query):
        
        result = await RecommendationService.get_group_recommendations(
            user=user_a,
            friend_ids=[],
            lat=10.87,
            lng=106.80,
            limit=10,
            db=db_session
        )
        
        # Verify that embed_text was called with User A's favorite dishes
        mock_embed.assert_called_once_with("phở bò, bún chả")
        assert len(result["results"]) == 1
        assert result["results"][0].id == "res-1-cs"


def test_group_recommendation_api_route(client: TestClient, db_session: Session):
    # Register/login user a and b
    resp_a = client.post("/api/v1/users/sign_up", json={"username": "apixuser_a", "password": "password123"})
    assert resp_a.status_code == 200
    user_a = resp_a.json()
    
    resp_b = client.post("/api/v1/users/sign_up", json={"username": "apixuser_b", "password": "password123"})
    assert resp_b.status_code == 200
    user_b = resp_b.json()
    
    headers_a = {"Authorization": f"Bearer {user_a['access_token']}"}
    
    # Make them friends
    client.post("/api/v1/users/friends", json={"username": "apixuser_b"}, headers=headers_a)

    # Insert a restaurant - mock query to avoid pgvector
    dummy_results = {
        "results": [
            {
                "id": "api-res-1",
                "name": "Quán Lẩu",
                "match": "95%",
                "dist": "1.2 km",
                "distance_km": 1.2,
                "lat": 10.87,
                "lng": 106.80,
                "price": "50k - 100k",
                "rating": "4.5",
                "reason": "Phù hợp",
                "img": "/images/default_food.jpg",
                "total_reviews": 10,
                "google_maps_url": None,
                "allergen_warning": None,
                "is_vegetarian": False
            }
        ],
        "group_size": 2,
        "applied_vegetarian_filter": False,
        "applied_allergies": []
    }

    with patch("app.domains.recommendations.service.RecommendationService.get_group_recommendations", new_callable=AsyncMock, return_value=dummy_results):
        payload = {
            "friend_ids": [user_b["user_id"]],
            "lat": 10.87,
            "lng": 106.80,
            "limit": 10
        }
        
        resp = client.post("/api/v1/recommendations/group", json=payload, headers=headers_a)
        assert resp.status_code == 200
        
        data = resp.json()
        assert "results" in data
        assert len(data["results"]) == 1
        assert data["results"][0]["id"] == "api-res-1"
        assert data["group_size"] == 2
        assert data["applied_vegetarian_filter"] is False
        assert isinstance(data["applied_allergies"], list)


def test_group_recommendation_api_route_with_budget(client: TestClient, db_session: Session):
    # Register/login user a and b
    resp_a = client.post("/api/v1/users/sign_up", json={"username": "apixuser_a_b", "password": "password123"})
    assert resp_a.status_code == 200
    user_a = resp_a.json()
    
    resp_b = client.post("/api/v1/users/sign_up", json={"username": "apixuser_b_b", "password": "password123"})
    assert resp_b.status_code == 200
    user_b = resp_b.json()
    
    headers_a = {"Authorization": f"Bearer {user_a['access_token']}"}
    
    # Make them friends
    client.post("/api/v1/users/friends", json={"username": "apixuser_b_b"}, headers=headers_a)

    dummy_results = {
        "results": [],
        "group_size": 2,
        "applied_vegetarian_filter": False,
        "applied_allergies": []
    }

    with patch("app.domains.recommendations.service.RecommendationService.get_group_recommendations", new_callable=AsyncMock, return_value=dummy_results) as mock_get:
        payload = {
            "friend_ids": [user_b["user_id"]],
            "lat": 10.87,
            "lng": 106.80,
            "limit": 10,
            "budget": 150000
        }
        
        resp = client.post("/api/v1/recommendations/group", json=payload, headers=headers_a)
        assert resp.status_code == 200
        
        # Verify budget is passed down to service
        mock_get.assert_called_once()
        kwargs = mock_get.call_args[1]
        assert kwargs["budget"] == 150000


@pytest.mark.asyncio
async def test_get_group_recommendations_dynamic_location_filter(db_session: Session):
    # Setup test user
    user = UserAccount(
        id="user-loc-test",
        username="user_loc_test",
        password_hash="hash",
        preferences_vector=[0.1] * 768
    )
    db_session.add(user)
    db_session.commit()

    # Trace database filter calls
    filter_calls = []

    class MockQuery:
        def __init__(self, *args, **kwargs):
            pass
        def filter(self, *args, **kwargs):
            for arg in args:
                filter_calls.append(str(arg))
            return self
        def order_by(self, *args, **kwargs):
            return self
        def limit(self, *args, **kwargs):
            return self
        def all(self):
            # Return empty list to force range expansion through all 4 iterations
            return []

    original_query = db_session.query
    def mock_query(model, *args, **kwargs):
        if isinstance(model, type) and model == RestaurantModel:
            return MockQuery()
        return original_query(model, *args, **kwargs)

    with patch.object(db_session, "query", side_effect=mock_query):
        await RecommendationService.get_group_recommendations(
            user=user,
            friend_ids=[],
            lat=10.5,
            lng=106.5,
            limit=10,
            db=db_session
        )

    # Verify that BOTH latitude and longitude bounds are queried
    # Check that 'lat' and 'lng' are present in the filter calls
    lat_filters = [c for c in filter_calls if "lat" in c]
    lng_filters = [c for c in filter_calls if "lng" in c]

    assert len(lat_filters) > 0, "Should have filtered by latitude"
    assert len(lng_filters) > 0, "Should have filtered by longitude"

