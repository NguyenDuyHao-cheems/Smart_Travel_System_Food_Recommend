"""
test_llm_parser.py — Unit tests for llm_parser.py (Gemini NLP parser).
"""

import json
import io
import logging
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Optional


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def clear_query_cache():
    from app.nlp.llm_parser import _query_cache
    _query_cache.clear()

def make_gemini_response(cleaned_query="phở bò, bún bò Huế"):
    """Tạo mock Gemini API response dict."""
    content = {"cleaned_query": cleaned_query}
    return {
        "candidates": [
            {
                "content": {
                    "parts": [{"text": json.dumps(content)}]
                }
            }
        ]
    }


def mock_httpx_response(status_code: int = 200, json_data: Optional[dict] = None):
    """Tạo mock httpx Response object."""
    mock = MagicMock()
    mock.status_code = status_code
    mock.json.return_value = json_data or {}
    if status_code >= 400:
        import httpx
        mock.raise_for_status.side_effect = httpx.HTTPStatusError(
            message="Error", request=MagicMock(), response=mock
        )
    else:
        mock.raise_for_status.return_value = None
    return mock


# ---------------------------------------------------------------------------
# Tests for _call_gemini (async, uses httpx)
# ---------------------------------------------------------------------------


class TestCallGemini:
    """Tests cho internal _call_gemini() function."""

    @pytest.mark.asyncio
    async def test_success_returns_cleaned_query(self):
        """Gemini trả về JSON hợp lệ → parse đúng."""
        from app.nlp.llm_parser import _call_gemini

        gemini_data = make_gemini_response(cleaned_query="phở bò, bún bò")

        mock_resp = mock_httpx_response(200, gemini_data)
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_resp)

        with patch("app.nlp.llm_parser.httpx.AsyncClient", return_value=mock_client):
            result = await _call_gemini("tôi muốn ăn phở bò")

        assert result == "phở bò, bún bò"

    @pytest.mark.asyncio
    async def test_empty_candidates_returns_none(self):
        """Response với candidates=[] → trả về None."""
        from app.nlp.llm_parser import _call_gemini

        mock_resp = mock_httpx_response(200, {"candidates": []})
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_resp)

        with patch("app.nlp.llm_parser.httpx.AsyncClient", return_value=mock_client):
            result = await _call_gemini("test")

        assert result is None

    @pytest.mark.asyncio
    async def test_malformed_json_raises_exception(self):
        """Gemini trả về text không phải JSON → raise exception."""
        from app.nlp.llm_parser import _call_gemini

        bad_resp = {
            "candidates": [
                {"content": {"parts": [{"text": "not valid json{{"}]}}
            ]
        }
        mock_resp = mock_httpx_response(200, bad_resp)
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_resp)

        with patch("app.nlp.llm_parser.httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(Exception):
                await _call_gemini("test")

    @pytest.mark.asyncio
    async def test_http_error_propagates(self):
        """HTTP 500 → raise_for_status gây exception."""
        from app.nlp.llm_parser import _call_gemini
        import httpx

        mock_resp = mock_httpx_response(500)
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_resp)

        with patch("app.nlp.llm_parser.httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(httpx.HTTPStatusError):
                await _call_gemini("test")

    @pytest.mark.asyncio
    async def test_disconnected_returns_none_in_call_gemini(self):
        """Khi request báo disconnected -> _call_gemini trả về None."""
        from app.nlp.llm_parser import _call_gemini

        mock_request = AsyncMock()
        mock_request.is_disconnected = AsyncMock(return_value=True)

        result = await _call_gemini("test", request=mock_request)
        assert result is None


# ---------------------------------------------------------------------------
# Tests for clean_query_with_gemini (fallback logic)
# ---------------------------------------------------------------------------


class TestCleanQueryWithGemini:
    """Tests cho clean_query_with_gemini() — bao gồm fallback."""

    @pytest.mark.asyncio
    async def test_empty_api_key_falls_back_to_original(self):
        """Khi GEMINI_API_KEY rỗng → dùng original text fallback."""
        from app.nlp.llm_parser import clean_query_with_gemini

        with patch("app.nlp.llm_parser.settings") as mock_settings:
            mock_settings.GEMINI_API_KEY = ""
            mock_settings.GEMINI_MODEL_NAME = "gemini-2.0-flash"
            result = await clean_query_with_gemini("phở bò 50k")

        assert result == "phở bò 50k"

    @pytest.mark.asyncio
    async def test_vietnamese_logging_is_safe_for_cp1252_console(self):
        """Vietnamese user text must not break Windows console logging."""
        from app.nlp.llm_parser import clean_query_with_gemini, logger

        output = io.BytesIO()
        handler = logging.StreamHandler(
            io.TextIOWrapper(output, encoding="cp1252", errors="strict", write_through=True)
        )
        old_level = logger.level
        logger.addHandler(handler)
        logger.setLevel(logging.DEBUG)
        try:
            with patch("app.nlp.llm_parser.settings") as mock_settings:
                mock_settings.GEMINI_API_KEY = ""
                result = await clean_query_with_gemini(
                    "Hôm nay trời lạnh, thèm ăn món lẩu nóng hổi ngon rẻ"
                )
        finally:
            logger.removeHandler(handler)
            logger.setLevel(old_level)
            handler.close()

        assert result == "Hôm nay trời lạnh, thèm ăn món lẩu nóng hổi ngon rẻ"

    @pytest.mark.asyncio
    async def test_gemini_error_falls_back_to_original(self):
        """Khi Gemini lỗi → fallback mà không crash."""
        from app.nlp.llm_parser import clean_query_with_gemini
        import httpx

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(side_effect=httpx.TimeoutException("timeout"))

        with patch("app.nlp.llm_parser.httpx.AsyncClient", return_value=mock_client):
            with patch("app.nlp.llm_parser.settings") as mock_settings:
                mock_settings.GEMINI_API_KEY = "test-key"
                mock_settings.GEMINI_MODEL_NAME = "gemini-2.0-flash"
                result = await clean_query_with_gemini("phở bò 50k")

        assert result == "phở bò 50k"

    @pytest.mark.asyncio
    async def test_success_returns_cleaned_query(self):
        """Khi gọi Gemini thành công, trả về cleaned_query."""
        from app.nlp.llm_parser import clean_query_with_gemini

        gemini_data = make_gemini_response(cleaned_query="phở bò")
        mock_resp = mock_httpx_response(200, gemini_data)
        
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_resp)

        with patch("app.nlp.llm_parser.httpx.AsyncClient", return_value=mock_client):
            with patch("app.nlp.llm_parser.settings") as mock_settings:
                mock_settings.GEMINI_API_KEY = "test-key"
                mock_settings.GEMINI_MODEL_NAME = "gemini-2.0-flash"
                result = await clean_query_with_gemini("mình muốn ăn phở bò")

        assert result == "phở bò"

    @pytest.mark.asyncio
    async def test_disconnected_aborts_gemini_call(self):
        """Khi request báo disconnected -> huỷ gọi Gemini API và trả về text gốc."""
        from app.nlp.llm_parser import clean_query_with_gemini

        mock_request = AsyncMock()
        mock_request.is_disconnected = AsyncMock(return_value=True)

        with patch("app.nlp.llm_parser.settings") as mock_settings:
            mock_settings.GEMINI_API_KEY = "test-key"
            mock_settings.GEMINI_MODEL_NAME = "gemini-2.0-flash"
            result = await clean_query_with_gemini("phở bò", request=mock_request)

        assert result == "phở bò"
        mock_request.is_disconnected.assert_called_once()

    @pytest.mark.asyncio
    async def test_cache_hit_returns_cached_query(self):
        """Khi có trong cache -> lấy từ cache mà không gọi Gemini API."""
        from app.nlp.llm_parser import clean_query_with_gemini, _query_cache
        
        # Populate cache
        _query_cache["hôm nay trời lạnh ăn gì"] = "lẩu thái, đồ nướng"
        
        # Gọi clean_query_with_gemini mà không cần mock Gemini client
        result = await clean_query_with_gemini("Hôm nay trời lạnh ăn gì")
        assert result == "lẩu thái, đồ nướng"
