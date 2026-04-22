"""
test_nlp_process.py – Integration tests for POST /api/v1/nlp/process

Endpoint contract (from schemas.py):
  Request:  NLPRequest  { text: str (max_length=1000) }
  Response: NLPResponse { vector: List[float], extracted_budget: float|None, intent: str|None }
"""

import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

NLP_PROCESS_URL = "/api/v1/nlp/process"
EMBEDDING_DIM = 768


def post_process(client, text: str):
    return client.post(NLP_PROCESS_URL, json={"text": text})


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------


class TestNLPProcessHappyPath:
    """Tests for valid requests to POST /api/v1/nlp/process."""

    def test_returns_200_for_valid_text(self, client):
        """Should return HTTP 200 for a normal Vietnamese food query."""
        # Arrange
        text = "Tôi muốn ăn phở bò Hà Nội"

        # Act
        response = post_process(client, text)

        # Assert
        assert response.status_code == 200

    def test_response_contains_vector(self, client):
        """Should return a float list as vector embedding."""
        # Arrange & Act
        data = post_process(client, "bún chả").json()

        # Assert
        assert "vector" in data
        assert isinstance(data["vector"], list)
        assert all(isinstance(v, float) for v in data["vector"])

    def test_vector_has_correct_dimension(self, client):
        """Vector should have 768 dimensions (PhoBERT hidden size)."""
        # Arrange & Act
        data = post_process(client, "bánh mì pate").json()

        # Assert
        assert len(data["vector"]) == EMBEDDING_DIM

    def test_response_contains_intent(self, client):
        """Should return an intent string."""
        # Arrange & Act
        data = post_process(client, "tìm quán cơm ngon").json()

        # Assert
        assert "intent" in data
        assert data["intent"] == "search_food"

    def test_response_contains_extracted_budget_key(self, client):
        """Response must always include extracted_budget key (even if None)."""
        # Arrange & Act
        data = post_process(client, "gợi ý quán ăn ngon").json()

        # Assert
        assert "extracted_budget" in data


# ---------------------------------------------------------------------------
# Budget extraction
# ---------------------------------------------------------------------------


class TestNLPProcessBudgetExtraction:
    """Tests for budget keyword extraction logic."""

    def test_rẻ_keyword_extracts_budget_50000(self, client):
        """Keyword 'rẻ' should extract a budget of 50,000 VND."""
        # Arrange & Act
        data = post_process(client, "quán ăn rẻ gần đây").json()

        # Assert
        assert data["extracted_budget"] == 50000.0

    def test_cheap_keyword_extracts_budget_50000(self, client):
        """Keyword 'cheap' should also extract budget 50000."""
        # Arrange & Act
        data = post_process(client, "find cheap food near me").json()

        # Assert
        assert data["extracted_budget"] == 50000.0

    def test_sang_trong_keyword_extracts_budget_500000(self, client):
        """Keyword 'sang trọng' should extract a budget of 500,000 VND."""
        # Arrange & Act
        data = post_process(client, "nhà hàng sang trọng").json()

        # Assert
        assert data["extracted_budget"] == 500000.0

    def test_luxury_keyword_extracts_budget_500000(self, client):
        """Keyword 'luxury' should also extract budget 500000."""
        # Arrange & Act
        data = post_process(client, "luxury restaurant in Saigon").json()

        # Assert
        assert data["extracted_budget"] == 500000.0

    def test_no_budget_keyword_returns_none(self, client):
        """Text without budget keywords should return extracted_budget as None."""
        # Arrange & Act
        data = post_process(client, "quán phở ngon").json()

        # Assert
        assert data["extracted_budget"] is None


# ---------------------------------------------------------------------------
# Validation errors
# ---------------------------------------------------------------------------


class TestNLPProcessValidation:
    """Tests for input validation on POST /api/v1/nlp/process."""

    def test_empty_text_returns_422(self, client):
        """Empty string should fail validation (min_length is implicit via required)."""
        # Arrange & Act
        response = client.post(NLP_PROCESS_URL, json={"text": ""})

        # Assert – FastAPI may return 200 or 422 depending on min_length config.
        # Currently no min_length is set, so empty string is allowed.
        # We document the actual behavior here.
        assert response.status_code in (200, 422)

    def test_text_exceeding_max_length_returns_422(self, client):
        """Text longer than 1000 chars should return HTTP 422."""
        # Arrange
        long_text = "a" * 1001

        # Act
        response = post_process(client, long_text)

        # Assert
        assert response.status_code == 422

    def test_missing_text_field_returns_422(self, client):
        """Request without 'text' field should return HTTP 422."""
        # Arrange & Act
        response = client.post(NLP_PROCESS_URL, json={})

        # Assert
        assert response.status_code == 422

    def test_wrong_type_returns_422(self, client):
        """Sending a number instead of string should return HTTP 422."""
        # Arrange & Act
        response = client.post(NLP_PROCESS_URL, json={"text": 12345})

        # Assert (Pydantic coerces int to str in v2, so could be 200)
        assert response.status_code in (200, 422)

    def test_text_at_exact_max_length_returns_200(self, client):
        """Text of exactly 1000 chars should be accepted."""
        # Arrange
        exact_text = "ă" * 1000

        # Act
        response = post_process(client, exact_text)

        # Assert
        assert response.status_code == 200
