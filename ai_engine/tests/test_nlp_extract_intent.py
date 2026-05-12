"""
test_nlp_extract_intent.py – Integration tests for POST /api/v1/nlp/extract-intent

Endpoint contract (from schemas.py):
  Request:  ExtractIntentRequest { text: str (max_length=1000), lat: float|None, lng: float|None }
  Response: ExtractIntentResponse { raw_text, cleaned_query, vector, lat, lng }
"""

import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

EXTRACT_INTENT_URL = "/api/v1/nlp/extract-intent"
EMBEDDING_DIM = 768


def post_extract(client, text: str, lat=None, lng=None):
    payload = {"text": text}
    if lat is not None:
        payload["lat"] = lat
    if lng is not None:
        payload["lng"] = lng
    return client.post(EXTRACT_INTENT_URL, json=payload)


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------


class TestExtractIntentHappyPath:
    """Tests for valid requests to POST /api/v1/nlp/extract-intent."""

    def test_returns_200_for_valid_text(self, client):
        """Should return HTTP 200 for a normal Vietnamese food query."""
        # Arrange & Act
        response = post_extract(client, "Tôi muốn ăn bún bò Huế")

        # Assert
        assert response.status_code == 200

    def test_response_contains_raw_text(self, client):
        """raw_text field should echo back the original input."""
        # Arrange
        text = "quán cơm ngon Quận 1"

        # Act
        data = post_extract(client, text).json()

        # Assert
        assert data["raw_text"] == text

    def test_response_contains_cleaned_query(self, client):
        """Should return a cleaned_query string."""
        # Arrange & Act
        data = post_extract(client, "phở bò gần đây").json()

        # Assert
        assert "cleaned_query" in data
        assert isinstance(data["cleaned_query"], str)

    def test_response_contains_vector(self, client):
        """Should return a float list as vector."""
        # Arrange & Act
        data = post_extract(client, "bánh xèo ngon").json()

        # Assert
        assert "vector" in data
        assert isinstance(data["vector"], list)
        assert len(data["vector"]) == EMBEDDING_DIM



    def test_lat_lng_are_passed_through(self, client):
        """lat and lng in request should be echoed back in response."""
        # Arrange
        lat, lng = 10.762622, 106.660172

        # Act
        data = post_extract(client, "bún thịt nướng", lat=lat, lng=lng).json()

        # Assert
        assert data["lat"] == pytest.approx(lat, rel=1e-5)
        assert data["lng"] == pytest.approx(lng, rel=1e-5)

    def test_lat_lng_default_to_none_when_not_provided(self, client):
        """When lat/lng are omitted, response should return None for both."""
        # Arrange & Act
        data = post_extract(client, "mì Quảng").json()

        # Assert
        assert data["lat"] is None
        assert data["lng"] is None





# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


class TestExtractIntentValidation:
    """Tests for input validation on POST /api/v1/nlp/extract-intent."""

    def test_missing_text_returns_422(self, client):
        """Request without 'text' field should return 422."""
        # Arrange & Act
        response = client.post(EXTRACT_INTENT_URL, json={"lat": 10.0})

        # Assert
        assert response.status_code == 422

    def test_text_exceeding_max_length_returns_422(self, client):
        """Text longer than 1000 characters should return 422."""
        # Arrange
        long_text = "b" * 1001

        # Act
        response = post_extract(client, long_text)

        # Assert
        assert response.status_code == 422

    def test_invalid_lat_type_returns_422(self, client):
        """Non-numeric lat should return 422."""
        # Arrange & Act
        response = client.post(
            EXTRACT_INTENT_URL, json={"text": "phở bò", "lat": "not_a_number"}
        )

        # Assert
        assert response.status_code == 422
