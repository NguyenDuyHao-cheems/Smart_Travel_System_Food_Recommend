import pytest
from app.main import app
from fastapi.testclient import TestClient
from app.domains.ranking.router import get_ranking_service

client = TestClient(app)

def test_rank_candidates_success():
    class MockService:
        def get_recommendations(self, db, request):
            return [10, 20, 30]

    app.dependency_overrides[get_ranking_service] = lambda: MockService()
    
    payload = {
        "user_id": "1",
        "pref_vector": [0.1, 0.2, 0.3],

        "k": 5,
        "offset": 0,
        "tags": ["Phở", "Bún"],
        "budget": 200.0,
        "user_location": [10.0, 106.0],
        "radius": 5.0
    }
    
    response = client.post("/api/v1/ml/rank-candidates", json=payload)
    assert response.status_code == 200
    assert response.json() == {"top_ids": [10, 20, 30]}
    
    app.dependency_overrides.clear()

def test_rank_candidates_default_params():
    class MockService:
        def get_recommendations(self, db, request):
            return [1]

    app.dependency_overrides[get_ranking_service] = lambda: MockService()
    
    payload = {
        "user_id": "1",
        "pref_vector": [0.1, 0.2, 0.3]
    }
    
    response = client.post("/api/v1/ml/rank-candidates", json=payload)
    assert response.status_code == 200
    req_body = response.request.content
    assert response.json() == {"top_ids": [1]}
    
    app.dependency_overrides.clear()

def test_rank_candidates_validation_error():
    payload = {
        "user_id": "1",
        # missing pref_vector which is required
    }
    response = client.post("/api/v1/ml/rank-candidates", json=payload)
    assert response.status_code == 422

def test_rank_candidates_internal_error():
    class MockErrorService:
        def get_recommendations(self, db, request):
            raise Exception("Mock DB or calculation failure")
            
    app.dependency_overrides[get_ranking_service] = lambda: MockErrorService()
    
    payload = {
        "user_id": "1",
        "pref_vector": [0.1, 0.2, 0.3]
    }
    
    response = client.post("/api/v1/ml/rank-candidates", json=payload)
    assert response.status_code == 500
    assert response.json() == {"detail": "Internal server error. Please try again later."}
    
    app.dependency_overrides.clear()
