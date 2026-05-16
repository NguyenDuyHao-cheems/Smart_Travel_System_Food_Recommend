import pytest
import uuid

INTERACTION_URL = "/api/v1/users/interaction"

class TestUserInteraction:
    def test_anonymous_interaction_success(self, client):
        """
        Test that an anonymous user can log an interaction.
        """
        payload = {
            "anonymous_id": f"guest-{uuid.uuid4().hex[:8]}",
            "res_id": "76d7cf4b-d0c2-5ec7-bc94-074d891974d1",
            "action_type": "VIEW_RESTAURANT",
            "duration_sec": 45,
            "metadata": {"source": "homepage", "device": "mobile"}
        }
        
        response = client.post(INTERACTION_URL, json=payload)
        
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "success"
        assert body["message"] == "Interaction logged successfully"
        assert "interaction_id" in body

    def test_authenticated_interaction_success(self, client, auth_headers):
        """
        Test that an authenticated user can log an interaction.
        """
        payload = {
            "res_id": "76d7cf4b-d0c2-5ec7-bc94-074d891974d1",
            "action_type": "CLICK_MENU",
            "duration_sec": 10,
            "metadata": {"source": "result_page"}
        }
        
        response = client.post(INTERACTION_URL, json=payload, headers=auth_headers)
        
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "success"
        assert "interaction_id" in body

    def test_interaction_missing_action_type_fails(self, client):
        """
        Test that missing action_type results in a 422 error.
        """
        payload = {
            "anonymous_id": "guest-123",
            "res_id": "76d7cf4b-d0c2-5ec7-bc94-074d891974d1"
        }
        
        response = client.post(INTERACTION_URL, json=payload)
        assert response.status_code == 422
