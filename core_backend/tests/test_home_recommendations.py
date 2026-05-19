import pytest
from unittest.mock import MagicMock
from app.domains.recommendations.service import RecommendationService
from app.domains.users.models import UserAccount
from app.domains.ranking.models import RestaurantModel

class DummyRestaurantModel:
    def __init__(self, id, lat, lng, price_range="50000-100000", rating_avg=4.5, total_reviews=10, name=None):
        self.id = id
        self.lat = lat
        self.lng = lng
        self.price_range = price_range
        self.rating_avg = rating_avg
        self.total_reviews = total_reviews
        self.name = name or f"Restaurant {id}"
        self.image_url = ""
        self.google_maps_url = None

def test_get_home_recs_no_user_uses_popularity():
    db = MagicMock()
    
    # 3 candidates
    candidates = [
        DummyRestaurantModel(id="1", lat=10.88, lng=106.81, rating_avg=4.9, total_reviews=20),
        DummyRestaurantModel(id="2", lat=10.875, lng=106.805, rating_avg=4.8, total_reviews=15),
        DummyRestaurantModel(id="3", lat=10.87, lng=106.80, rating_avg=4.7, total_reviews=10),
    ]
    
    # Mock db.query().filter().order_by().limit().all() (Self-returning pattern)
    mock_query = db.query.return_value
    mock_query.filter.return_value = mock_query
    mock_query.order_by.return_value = mock_query
    mock_query.limit.return_value = mock_query
    mock_query.all.return_value = candidates

    # Call under test
    results = RecommendationService.get_home_recommendations(
        user=None,
        lat=10.87,
        lng=106.80,
        limit=2,
        db=db
    )
    
    # Assert result structure and limits
    assert len(results) == 2
    assert results[0].match == "Thịnh Hành"
    
    # Ensure they are sorted by distance
    assert float(results[0].dist.split()[0]) <= float(results[1].dist.split()[0])

def test_get_home_recs_has_vector_uses_cosine():
    db = MagicMock()
    user = UserAccount(preferences_vector=[0.1]*768)
    
    candidates = [
        DummyRestaurantModel(id="1", lat=10.88, lng=106.81),
        DummyRestaurantModel(id="2", lat=10.875, lng=106.805)
    ]
    
    # Mock db.query().order_by().limit().all() (Self-returning pattern)
    mock_query = db.query.return_value
    mock_query.filter.return_value = mock_query
    mock_query.order_by.return_value = mock_query
    mock_query.limit.return_value = mock_query
    mock_query.all.return_value = candidates

    results = RecommendationService.get_home_recommendations(
        user=user,
        lat=10.87,
        lng=106.80,
        limit=5,
        db=db
    )
    
    assert len(results) == 2
    assert results[0].match == "95%"

def test_get_home_recs_filters_50km_radius():
    db = MagicMock()
    
    # One close candidate (0km), one far candidate (100km+)
    candidates = [
        DummyRestaurantModel(id="close", lat=10.87, lng=106.80),
        DummyRestaurantModel(id="far", lat=12.0, lng=108.0)
    ]
    
    mock_query = db.query.return_value
    mock_query.filter.return_value = mock_query
    mock_query.order_by.return_value = mock_query
    mock_query.limit.return_value = mock_query
    mock_query.all.return_value = candidates

    results = RecommendationService.get_home_recommendations(
        user=None,
        lat=10.87,
        lng=106.80,
        limit=5,
        db=db
    )
    
    # Far candidate should be filtered out (> 50km)
    assert len(results) == 1
    assert results[0].id == "close"

def test_get_home_recs_formats_price_and_reviews():
    db = MagicMock()
    
    # Test cases for price and reviews formatting
    candidates = [
        DummyRestaurantModel(id="1", lat=10.87, lng=106.80, price_range="50000-100000", total_reviews=10),
        DummyRestaurantModel(id="2", lat=10.87, lng=106.80, price_range="", total_reviews=0)
    ]
    
    mock_query = db.query.return_value
    mock_query.filter.return_value = mock_query
    mock_query.order_by.return_value = mock_query
    mock_query.limit.return_value = mock_query
    mock_query.all.return_value = candidates

    results = RecommendationService.get_home_recommendations(
        user=None,
        lat=10.87,
        lng=106.80,
        limit=5,
        db=db
    )
    
    assert len(results) == 2
    assert results[0].price == "50k - 100k"
    assert results[0].rating != "Chưa có đánh giá"
    
    assert results[1].price == "Liên hệ"
    assert results[1].rating == "Chưa có đánh giá"
