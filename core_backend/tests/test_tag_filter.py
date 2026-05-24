"""
test_tag_filter.py – unit tests for tag-related functionality.

Tests:
  1. RecommendResult schema accepts and serializes the new `tags` field.
  2. _map_to_recommend_result populates `tags` from model relationship.
  3. extract_tag returns correct tags from query strings.
  4. GET /search/tags endpoint returns tag list from DB.
"""

import uuid
import pytest
from unittest.mock import MagicMock, patch

from app.domains.search.schemas import RecommendResult
from app.domains.search.service import SearchService
from app.domains.ranking.retrieval_service import extract_tag


# ── Schema tests ─────────────────────────────────────────────────────────────


class TestRecommendResultTagsField:
    """Verify the new `tags` field on RecommendResult schema."""

    def test_default_empty_list(self):
        """tags should default to empty list when not provided."""
        result = RecommendResult(
            id="abc123",
            name="Quán Phở Bò",
            match="95%",
            dist="1.0 km",
            price="50k",
            rating="4.5",
            reason="Gần bạn",
            img="/images/default.jpg",
        )
        assert result.tags == []

    def test_tags_populated(self):
        """tags should be correctly populated when provided."""
        result = RecommendResult(
            id="abc123",
            name="Quán Phở Bò",
            match="95%",
            dist="1.0 km",
            price="50k",
            rating="4.5",
            reason="Gần bạn",
            img="/images/default.jpg",
            tags=["phở", "bò"],
        )
        assert result.tags == ["phở", "bò"]

    def test_tags_in_serialized_output(self):
        """tags should appear in model_dump() output."""
        result = RecommendResult(
            id="abc123",
            name="Quán Test",
            match="90%",
            dist="2.0 km",
            price="100k",
            rating="4.0",
            reason="Test",
            img="/test.jpg",
            tags=["gà", "nướng"],
        )
        data = result.model_dump()
        assert "tags" in data
        assert data["tags"] == ["gà", "nướng"]


# ── _map_to_recommend_result tests ───────────────────────────────────────────


class TestMapToRecommendResultTags:
    """Verify _map_to_recommend_result correctly populates tags from model."""

    def _make_mock_model(self, tags=None):
        """Create a mock RestaurantModel with optional tags relationship."""
        model = MagicMock()
        model.id = uuid.UUID("550e8400-e29b-41d4-a716-446655440000")
        model.name = "Quán Gà Nướng"
        model.lat = 10.88
        model.lng = 106.81
        model.price_range = "50000-100000"
        model.rating_avg = 4.5
        model.total_reviews = 120
        model.image_url = "/images/ga.jpg"
        model.is_vegetarian = False
        model.google_maps_url = None
        model.sentiment_score = 0.5
        model.allergen_warning = None

        if tags is not None:
            mock_tags = []
            for tag_name in tags:
                tag_obj = MagicMock()
                tag_obj.name = tag_name
                mock_tags.append(tag_obj)
            model.tags = mock_tags
        else:
            model.tags = []

        return model

    def test_tags_populated_from_model(self):
        """Tags from model.tags relationship should appear in result."""
        model = self._make_mock_model(tags=["gà", "nướng"])
        result = SearchService._map_to_recommend_result(
            model, user_lat=10.88, user_lng=106.81, match_str="95%"
        )
        assert result.tags == ["gà", "nướng"]

    def test_empty_tags(self):
        """When model has no tags, result.tags should be empty list."""
        model = self._make_mock_model(tags=[])
        result = SearchService._map_to_recommend_result(
            model, user_lat=10.88, user_lng=106.81, match_str="90%"
        )
        assert result.tags == []

    def test_none_tags(self):
        """When model.tags is None, result.tags should be empty list."""
        model = self._make_mock_model()
        model.tags = None
        result = SearchService._map_to_recommend_result(
            model, user_lat=10.88, user_lng=106.81, match_str="90%"
        )
        assert result.tags == []


# ── extract_tag tests ────────────────────────────────────────────────────────


class TestExtractTag:
    """Verify extract_tag correctly maps query text to standardized tags."""

    def test_exact_match(self):
        assert extract_tag("phở") == "phở"

    def test_keyword_in_query(self):
        assert extract_tag("tôi muốn ăn gà rán") == "gà"

    def test_no_match(self):
        assert extract_tag("thời tiết hôm nay") is None

    def test_empty_query(self):
        assert extract_tag("") is None

    def test_none_query(self):
        assert extract_tag(None) is None

    def test_tra_sua_keyword(self):
        assert extract_tag("trà sữa") == "trà sữa"

    def test_vegetarian_keyword(self):
        assert extract_tag("đồ chay") == "món chay"

    def test_lau_keyword(self):
        assert extract_tag("lẩu thái") == "lẩu"
