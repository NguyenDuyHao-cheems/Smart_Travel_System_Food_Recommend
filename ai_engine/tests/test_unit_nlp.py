"""
test_unit_nlp.py – Unit tests for pure NLP utility functions.

These tests do NOT require the HTTP server or the PhoBERT model.
They test the logic of:
  - extract_budget()    (query_parser.py)
  - extract_tags()      (query_parser.py)
  - extract_intent_and_budget()  (extractor.py)
"""

import pytest

from app.nlp.query_parser import extract_budget
from app.core.config import settings
from app.nlp.service import generate_mean_pooled_embedding


# ---------------------------------------------------------------------------
# extract_budget()
# ---------------------------------------------------------------------------


class TestExtractBudget:
    """Unit tests for the extract_budget() function."""
    def test_extracts_under_50k_phrase(self):
        assert extract_budget("quán ăn dưới 50k") == 50000

    def test_extracts_about_100_nghin_phrase(self):
        assert extract_budget("khoảng 100 nghìn một người") == 100000

    def test_extracts_cheap_keyword(self):
        assert extract_budget("tìm quán ăn rẻ") == 30000

    def test_explicit_budget_takes_priority_over_cheap_keyword(self):
        assert extract_budget("quán rẻ dưới 50k") == 50000

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



class TestEmbeddingFallback:
    def test_fallback_embedding_has_expected_dimension(self, monkeypatch):
        def broken_provider():
            raise RuntimeError("model not loaded")

        monkeypatch.setattr("app.nlp.service.get_embedding_model", broken_provider)

        vector = generate_mean_pooled_embedding("phở bò dưới 50k")

        assert isinstance(vector, list)
        assert len(vector) == settings.VECTOR_DIM
        assert all(isinstance(value, float) for value in vector)

    def test_fallback_embedding_is_deterministic(self, monkeypatch):
        def broken_provider():
            raise RuntimeError("model not loaded")

        monkeypatch.setattr("app.nlp.service.get_embedding_model", broken_provider)

        first = generate_mean_pooled_embedding("bún chả rẻ")
        second = generate_mean_pooled_embedding("bún chả rẻ")

        assert first == second

    def test_generate_mean_pooled_embedding_with_segmentation(self, monkeypatch):
        class DummyModel:
            def encode(self, text):
                self.last_encoded_text = text
                class MockTensor:
                    def tolist(self):
                        return [0.1] * settings.VECTOR_DIM
                return MockTensor()
                
        dummy = DummyModel()
        monkeypatch.setattr("app.nlp.service.get_embedding_model", lambda: dummy)
        
        # Call generate_mean_pooled_embedding
        vector = generate_mean_pooled_embedding("bún chả hà nội")
        
        # Check if the word segmentation was applied
        assert dummy.last_encoded_text == "bún chả hà_nội"
        assert len(vector) == settings.VECTOR_DIM

# ---------------------------------------------------------------------------
# End of tests
# ---------------------------------------------------------------------------
