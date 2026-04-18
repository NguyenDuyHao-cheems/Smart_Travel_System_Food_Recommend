"""
test_nlp_extract_intent.py – Integration tests for POST /api/v1/nlp/extract-intent

Endpoint contract (from schemas.py):
  Request:  ExtractIntentRequest { text: str (max_length=1000), lat: float|None, lng: float|None }
  Response: ExtractIntentResponse { raw_text, tags, budget, query_vector, lat, lng }
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

    def test_response_contains_tags_list(self, client):
        """Should return a list of string tags."""
        # Arrange & Act
        data = post_extract(client, "phở bò gần đây").json()

        # Assert
        assert "tags" in data
        assert isinstance(data["tags"], list)
        assert all(isinstance(t, str) for t in data["tags"])

    def test_response_contains_query_vector(self, client):
        """Should return a float list as query_vector."""
        # Arrange & Act
        data = post_extract(client, "bánh xèo ngon").json()

        # Assert
        assert "query_vector" in data
        assert isinstance(data["query_vector"], list)
        assert len(data["query_vector"]) == EMBEDDING_DIM

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
# Budget extraction
# ---------------------------------------------------------------------------


class TestExtractIntentBudget:
    """Tests for budget extraction in /extract-intent."""

    def test_budget_50k_notation_extracted(self, client):
        """'50k' should be extracted as budget = 50000."""
        # Arrange & Act
        data = post_extract(client, "quán ăn dưới 50k").json()

        # Assert
        assert data["budget"] == 50000

    def test_budget_100k_notation_extracted(self, client):
        """'100k' should be extracted as budget = 100000."""
        # Arrange & Act
        data = post_extract(client, "tầm 100k ăn được gì").json()

        # Assert
        assert data["budget"] == 100000

    def test_no_budget_in_text_returns_none(self, client):
        """Text without any numeric budget info should return budget=None."""
        # Arrange & Act
        data = post_extract(client, "nhà hàng ngon").json()

        # Assert
        assert data["budget"] is None


# ---------------------------------------------------------------------------
# Tags extraction
# ---------------------------------------------------------------------------


class TestExtractIntentTags:
    """Tests for tag extraction logic via extract_tags."""

    def test_stop_words_are_excluded_from_tags(self, client):
        """Vietnamese stop words like 'muốn', 'ăn', 'gần' should not appear in tags."""
        stop_words = {"muon", "muốn", "an", "ăn", "gan", "gần", "toi", "tôi"}

        # Arrange & Act
        data = post_extract(client, "tôi muốn ăn gần đây").json()
        tags = set(data["tags"])

        # Assert
        overlap = stop_words & tags
        assert len(overlap) == 0, f"Stop words found in tags: {overlap}"

    def test_meaningful_food_words_are_in_tags(self, client):
        """The main dish name should appear in the tags list."""
        # Arrange & Act
        data = post_extract(client, "phở bò Hà Nội").json()

        # Assert
        assert "phở" in data["tags"] or "pho" in data["tags"]

    def test_digits_are_excluded_from_tags(self, client):
        """Pure digit tokens should not appear in tags."""
        # Arrange & Act
        data = post_extract(client, "ăn 50k bún chả").json()
        tags = data["tags"]

        # Assert
        assert not any(tag.isdigit() for tag in tags)


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
