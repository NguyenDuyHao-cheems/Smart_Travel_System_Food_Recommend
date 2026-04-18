"""
test_unit_nlp.py – Unit tests for pure NLP utility functions.

These tests do NOT require the HTTP server or the PhoBERT model.
They test the logic of:
  - extract_budget()    (query_parser.py)
  - extract_tags()      (query_parser.py)
  - extract_intent_and_budget()  (extractor.py)
"""

import pytest

from app.nlp.query_parser import extract_budget, extract_tags
from app.nlp.extractor import extract_intent_and_budget


# ---------------------------------------------------------------------------
# extract_budget()
# ---------------------------------------------------------------------------


class TestExtractBudget:
    """Unit tests for the extract_budget() function."""

    def test_extracts_50k_notation(self):
        """'50k' should return 50000."""
        assert extract_budget("tầm 50k") == 50000

    def test_extracts_100k_notation(self):
        """'100k' should return 100000."""
        assert extract_budget("dưới 100k") == 100000

    def test_extracts_uppercase_K(self):
        """'200K' (uppercase) should return 200000 (after lower())."""
        assert extract_budget("200K ăn được gì") == 200000

    def test_extracts_large_vnd_amount(self):
        """Direct VND amount >= 1000 should be returned as-is."""
        assert extract_budget("khoảng 150000 VND") == 150000

    def test_returns_none_for_no_budget(self):
        """Text without any numeric budget returns None."""
        assert extract_budget("quán phở ngon") is None

    def test_returns_none_for_small_number(self):
        """Number < 1000 without 'k' suffix should return None."""
        # value=5 < 1000, so not treated as budget
        assert extract_budget("đánh giá 5 sao") is None

    def test_handles_empty_string(self):
        """Empty string should return None."""
        assert extract_budget("") is None

    def test_handles_whitespace_between_number_and_k(self):
        """'50 k' with space should still be matched."""
        assert extract_budget("50 k") == 50000


# ---------------------------------------------------------------------------
# extract_tags()
# ---------------------------------------------------------------------------


class TestExtractTags:
    """Unit tests for the extract_tags() function."""

    def test_returns_list(self):
        """Should always return a list."""
        result = extract_tags("phở bò")
        assert isinstance(result, list)

    def test_basic_food_words_in_tags(self):
        """Key food words should appear in tags."""
        tags = extract_tags("phở bò ngon")
        assert "phở" in tags
        assert "bò" in tags

    def test_stop_words_excluded(self):
        """Vietnamese stop words must be filtered out."""
        stop_words = {"muon", "muốn", "an", "ăn", "gan", "gần", "toi", "tôi",
                      "duoi", "dưới", "tren", "trên", "tam", "tầm",
                      "khoang", "khoảng", "gia", "giá"}
        tags = set(extract_tags("tôi muốn ăn phở gần đây"))
        overlap = stop_words & tags
        assert len(overlap) == 0, f"Stop words found: {overlap}"

    def test_digits_excluded(self):
        """Pure digit tokens should not appear in tags."""
        tags = extract_tags("quán 50k bún chả")
        assert not any(tag.isdigit() for tag in tags)

    def test_k_suffix_amounts_removed(self):
        """Tokens like '50k' should be stripped before tagging."""
        tags = extract_tags("ăn tầm 50k bún chả")
        # '50k' should not appear as a tag
        assert "50k" not in tags

    def test_no_duplicates_in_tags(self):
        """Each tag should appear only once."""
        tags = extract_tags("phở bò phở gà phở")
        assert len(tags) == len(set(tags))

    def test_empty_string_returns_empty_list(self):
        """Empty input should return an empty list."""
        assert extract_tags("") == []

    def test_mixed_viet_and_english(self):
        """Should handle mixed Vietnamese/English text."""
        tags = extract_tags("bún chả near me")
        assert "bún" in tags
        assert "chả" in tags or "cha" in tags


# ---------------------------------------------------------------------------
# extract_intent_and_budget()
# ---------------------------------------------------------------------------


class TestExtractIntentAndBudget:
    """Unit tests for the extract_intent_and_budget() function."""

    def test_always_returns_search_food_intent(self):
        """Intent should always be 'search_food' in current implementation."""
        result = extract_intent_and_budget("phở bò Hà Nội")
        assert result["intent"] == "search_food"

    def test_rẻ_keyword_sets_budget_50000(self):
        """'rẻ' keyword → budget = 50000."""
        result = extract_intent_and_budget("quán ăn rẻ")
        assert result["extracted_budget"] == 50000.0

    def test_cheap_keyword_sets_budget_50000(self):
        """'cheap' keyword → budget = 50000."""
        result = extract_intent_and_budget("cheap food near me")
        assert result["extracted_budget"] == 50000.0

    def test_sang_trong_keyword_sets_budget_500000(self):
        """'sang trọng' keyword → budget = 500000."""
        result = extract_intent_and_budget("nhà hàng sang trọng Hà Nội")
        assert result["extracted_budget"] == 500000.0

    def test_luxury_keyword_sets_budget_500000(self):
        """'luxury' keyword → budget = 500000."""
        result = extract_intent_and_budget("luxury dining experience")
        assert result["extracted_budget"] == 500000.0

    def test_no_budget_keyword_returns_none(self):
        """Text without budget keywords → extracted_budget = None."""
        result = extract_intent_and_budget("bún bò Huế")
        assert result["extracted_budget"] is None

    def test_returns_dict_with_correct_keys(self):
        """Result must contain both 'intent' and 'extracted_budget' keys."""
        result = extract_intent_and_budget("quán cơm")
        assert "intent" in result
        assert "extracted_budget" in result

    def test_case_insensitive_rẻ_detection(self):
        """'RẺ' in uppercase should also match."""
        result = extract_intent_and_budget("quán ăn RẺ")
        assert result["extracted_budget"] == 50000.0
