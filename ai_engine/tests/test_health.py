"""
test_health.py – Tests for health check and root endpoints.

Endpoints:
- GET /
- GET /api/health
"""

import pytest


class TestRootEndpoint:
    """Tests for GET /"""

    def test_root_returns_200(self, client):
        """Should return HTTP 200 OK."""
        # Act
        response = client.get("/")

        # Assert
        assert response.status_code == 200

    def test_root_returns_welcome_message(self, client):
        """Should return a JSON with a welcome message key."""
        # Act
        response = client.get("/")
        data = response.json()

        # Assert
        assert "message" in data
        assert isinstance(data["message"], str)
        assert len(data["message"]) > 0


class TestHealthEndpoint:
    """Tests for GET /api/health"""

    def test_health_returns_200(self, client):
        """Should return HTTP 200 OK."""
        # Act
        response = client.get("/api/health")

        # Assert
        assert response.status_code == 200

    def test_health_status_is_online(self, client):
        """Should report status as 'online'."""
        # Act
        data = client.get("/api/health").json()

        # Assert
        assert data["status"] == "online"

    def test_health_ai_engine_flag_is_true(self, client):
        """Should confirm ai_engine is active."""
        # Act
        data = client.get("/api/health").json()

        # Assert
        assert data["ai_engine"] is True
