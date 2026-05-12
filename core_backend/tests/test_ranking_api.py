import pytest
from app.main import app
from fastapi.testclient import TestClient
from unittest.mock import patch

client = TestClient(app)

@patch('app.domains.ranking.ranking_service.RankingService.get_recommendations')
def test_rank_candidates_success(mock_get_recommendations):
    # Mock behavior of async function
    async def mock_coro(*args, **kwargs):
        return ["10", "20", "30"]
    mock_get_recommendations.side_effect = mock_coro
    
    payload = {
        "user_id": "1",
        "user_location": [10.0, 106.0],
        "k": 5,
        "offset": 0,
        "tags": ["Phở", "Bún"],
        "budget": 200,
        "radius": 5.0
    }
    
    response = client.post("/api/v1/ml/rank", json=payload)
    assert response.status_code == 200
    assert response.json() == {"ranked_ids": ["10", "20", "30"], "scores": None}

def test_rank_candidates_validation_error():
    payload = {
        "user_id": "1",
        # missing user_location which is required
    }
    response = client.post("/api/v1/ml/rank", json=payload)
    assert response.status_code == 422

@patch('app.domains.ranking.ranking_service.RankingService.get_recommendations')
def test_rank_candidates_internal_error(mock_get_recommendations):
    async def mock_coro(*args, **kwargs):
        raise Exception("Mock DB or calculation failure")
    mock_get_recommendations.side_effect = mock_coro
    
    payload = {
        "user_id": "1",
        "user_location": [10.0, 106.0]
    }
    
    response = client.post("/api/v1/ml/rank", json=payload)
    assert response.status_code == 500
    assert response.json() == {"detail": "Internal server error. Please try again later."}
