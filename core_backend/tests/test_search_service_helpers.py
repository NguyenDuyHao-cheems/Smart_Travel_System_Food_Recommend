import pytest
from app.domains.search.service import SearchService
from app.domains.search.schemas import RecommendResult

@pytest.fixture
def search_service():
    from unittest.mock import MagicMock
    return SearchService(ai_client=MagicMock())

def make_mock_result(price: str, dist: str) -> RecommendResult:
    return RecommendResult(
        id=1,
        name="Test",
        match="90%",
        dist=dist,
        price=price,
        rating="4.5",
        reason="Test",
        img="test.jpg"
    )

def test_extract_min_price_valid(search_service):
    res = make_mock_result(price="49k - 89k", dist="1.1 km")
    assert search_service._extract_min_price(res) == 49000

def test_extract_min_price_malformed(search_service):
    # Should not crash, returns high sentinel
    res = make_mock_result(price="Free", dist="1.1 km")
    assert search_service._extract_min_price(res) == 999_999_999
    
    res2 = make_mock_result(price="", dist="1.1 km")
    assert search_service._extract_min_price(res2) == 999_999_999

def test_extract_distance_km_valid(search_service):
    res = make_mock_result(price="49k", dist="1.5 km")
    assert search_service._extract_distance_km(res) == 1.5

def test_extract_distance_km_malformed(search_service):
    # Should not crash, returns large sentinel
    res = make_mock_result(price="49k", dist="nearby")
    assert search_service._extract_distance_km(res) == 9999.0
    
    res2 = make_mock_result(price="49k", dist="")
    assert search_service._extract_distance_km(res2) == 9999.0
