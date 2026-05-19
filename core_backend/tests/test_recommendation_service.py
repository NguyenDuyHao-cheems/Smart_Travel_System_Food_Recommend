import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.recommendation_service import recommend, _apply_sentiment_search_boost

class DummyCandidate:
    def __init__(self, id, distance=0.1, rating_avg=4.5, total_reviews=10, sentiment_score=0.8):
        self.id = id
        self.distance = distance
        self.rating_avg = rating_avg
        self.total_reviews = total_reviews
        self.sentiment_score = sentiment_score
        self.ranking_score = None
        self.name = f"Restaurant {id}"
        self.price_range = "50000"
        self.image_url = ""

@pytest.mark.asyncio
async def test_recommend_no_candidates_returns_empty():
    db = MagicMock()
    with patch("app.services.recommendation_service.get_user_allergies", return_value=[]), \
         patch("app.services.recommendation_service.get_user_preferences_vector", return_value=None), \
         patch("app.services.recommendation_service.RetrievalService") as mock_retrieval_cls:
         
        mock_retrieval = MagicMock()
        mock_retrieval.get_candidates.return_value = []
        mock_retrieval_cls.return_value = mock_retrieval

        result = await recommend("mì cay", "user-1", db)
        assert result["results"] == []
        assert result["filtered_out_count"] == 0
        assert result["allergen_flagged_count"] == 0
        assert result["fallback_applied"] is False

@pytest.mark.asyncio
async def test_recommend_few_candidates_skips_rerank():
    db = MagicMock()
    # 2 candidates (less than 3 cosine-qualified ones)
    candidates = [
        DummyCandidate(id="1", distance=0.1),
        DummyCandidate(id="2", distance=0.15)
    ]
    with patch("app.services.recommendation_service.get_user_allergies", return_value=[]), \
         patch("app.services.recommendation_service.get_user_preferences_vector", return_value=None), \
         patch("app.services.recommendation_service.RetrievalService") as mock_retrieval_cls, \
         patch("app.services.recommendation_service.annotate_allergy", return_value=(candidates, 0)):
         
        mock_retrieval = MagicMock()
        mock_retrieval.get_candidates.return_value = candidates
        mock_retrieval_cls.return_value = mock_retrieval

        result = await recommend("mì cay", "user-1", db, query_vector=[0.1]*768)
        # Should return safe candidates directly
        assert len(result["results"]) == 2
        assert result["results"] == candidates

@pytest.mark.asyncio
async def test_recommend_basic_mode_blends_saved_user_preferences():
    db = MagicMock()
    query_vector = [1.0, 1.0]
    user_vector = [0.0, 0.0]
    with patch("app.services.recommendation_service.get_user_allergies", return_value=[]), \
         patch("app.services.recommendation_service.get_user_preferences_vector", return_value=user_vector), \
         patch("app.services.recommendation_service.RetrievalService") as mock_retrieval_cls:

        mock_retrieval = MagicMock()
        mock_retrieval.get_candidates.return_value = []
        mock_retrieval_cls.return_value = mock_retrieval

        await recommend("mi cay", "user-1", db, query_vector=query_vector)

        assert mock_retrieval.get_candidates.call_args.kwargs["query_vector"] == [0.85, 0.85]

@pytest.mark.asyncio
async def test_recommend_emotion_mode_ignores_saved_user_preferences_for_retrieval():
    db = MagicMock()
    query_vector = [1.0, 1.0]
    user_vector = [0.0, 0.0]
    with patch("app.services.recommendation_service.get_user_allergies", return_value=[]), \
         patch("app.services.recommendation_service.get_user_preferences_vector", return_value=user_vector) as mock_preferences, \
         patch("app.services.recommendation_service.RetrievalService") as mock_retrieval_cls:

        mock_retrieval = MagicMock()
        mock_retrieval.get_candidates.return_value = []
        mock_retrieval_cls.return_value = mock_retrieval

        await recommend(
            "mi cay",
            "user-1",
            db,
            query_vector=query_vector,
            search_mode="emotion",
        )

        mock_preferences.assert_not_called()
        assert mock_retrieval.get_candidates.call_args.kwargs["query_vector"] == query_vector

@pytest.mark.asyncio
async def test_recommend_few_candidates_emotion_mode_applies_sentiment_before_skip():
    db = MagicMock()
    candidates = [
        DummyCandidate(id="negative", distance=0.12, rating_avg=4.0, total_reviews=80, sentiment_score=-0.8),
        DummyCandidate(id="positive", distance=0.14, rating_avg=4.0, total_reviews=80, sentiment_score=0.9),
    ]
    with patch("app.services.recommendation_service.get_user_allergies", return_value=[]), \
         patch("app.services.recommendation_service.get_user_preferences_vector", return_value=None), \
         patch("app.services.recommendation_service.RetrievalService") as mock_retrieval_cls, \
         patch("app.services.recommendation_service.annotate_allergy", return_value=(candidates, 0)):

        mock_retrieval = MagicMock()
        mock_retrieval.get_candidates.return_value = candidates
        mock_retrieval_cls.return_value = mock_retrieval

        result = await recommend(
            "mi cay",
            "user-1",
            db,
            query_vector=[0.1] * 768,
            search_mode="emotion",
        )

        assert [c.id for c in result["results"]] == ["positive", "negative"]

@pytest.mark.asyncio
async def test_recommend_happy_path_with_rerank():
    db = MagicMock()
    # 4 candidates (enough to trigger LambdaMART rerank)
    candidates = [
        DummyCandidate(id="1", distance=0.1),
        DummyCandidate(id="2", distance=0.15),
        DummyCandidate(id="3", distance=0.2),
        DummyCandidate(id="4", distance=0.25)
    ]
    featured = [
        {"res_id": "1", "similarity_score": 90},
        {"res_id": "2", "similarity_score": 85},
        {"res_id": "3", "similarity_score": 80},
        {"res_id": "4", "similarity_score": 75}
    ]

    class MockResponse:
        def __init__(self, status_code, json_data):
            self.status_code = status_code
            self._json_data = json_data
        def json(self):
            return self._json_data

    with patch("app.services.recommendation_service.get_user_allergies", return_value=[]), \
         patch("app.services.recommendation_service.get_user_preferences_vector", return_value=None), \
         patch("app.services.recommendation_service.RetrievalService") as mock_retrieval_cls, \
         patch("app.services.recommendation_service.annotate_allergy", return_value=(candidates, 0)), \
         patch("app.services.recommendation_service.FeatureService") as mock_feature_cls, \
         patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
         
        mock_retrieval = MagicMock()
        mock_retrieval.get_candidates.return_value = candidates
        mock_retrieval_cls.return_value = mock_retrieval
        
        mock_feature = MagicMock()
        mock_feature.build_integer_features.return_value = featured
        mock_feature_cls.return_value = mock_feature
        
        # Rerank returns: order 3, 1, 4, 2
        mock_post.return_value = MockResponse(
            status_code=200, 
            json_data={"ranked_ids": ["3", "1", "4", "2"], "scores": [0.95, 0.85, 0.75, 0.65]}
        )

        result = await recommend("mì cay", "user-1", db, query_vector=[0.1]*768)
        
        results = result["results"]
        assert len(results) == 4
        # Confirm reranked order
        assert results[0].id == "3"
        assert results[0].ranking_score == 0.95
        assert results[1].id == "1"
        assert results[1].ranking_score == 0.85
        assert results[2].id == "4"
        assert results[2].ranking_score == 0.75
        assert results[3].id == "2"
        assert results[3].ranking_score == 0.65

@pytest.mark.asyncio
async def test_recommend_emotion_mode_pre_ranks_before_lambdamart_without_post_override():
    db = MagicMock()
    candidates = [
        DummyCandidate(id="1", distance=0.12, rating_avg=4.0, total_reviews=80, sentiment_score=-0.8),
        DummyCandidate(id="2", distance=0.14, rating_avg=4.0, total_reviews=80, sentiment_score=0.9),
        DummyCandidate(id="3", distance=0.20, rating_avg=4.0, total_reviews=20, sentiment_score=0.3),
    ]
    featured = [
        {"res_id": "2", "similarity_score": 86},
        {"res_id": "3", "similarity_score": 80},
        {"res_id": "1", "similarity_score": 88},
    ]

    class MockResponse:
        def __init__(self, status_code, json_data):
            self.status_code = status_code
            self._json_data = json_data
        def json(self):
            return self._json_data

    with patch("app.services.recommendation_service.get_user_allergies", return_value=[]), \
         patch("app.services.recommendation_service.get_user_preferences_vector", return_value=None), \
         patch("app.services.recommendation_service.RetrievalService") as mock_retrieval_cls, \
         patch("app.services.recommendation_service.annotate_allergy", return_value=(candidates, 0)), \
         patch("app.services.recommendation_service.FeatureService") as mock_feature_cls, \
         patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:

        mock_retrieval = MagicMock()
        mock_retrieval.get_candidates.return_value = candidates
        mock_retrieval_cls.return_value = mock_retrieval

        mock_feature = MagicMock()
        mock_feature.build_integer_features.return_value = featured
        mock_feature_cls.return_value = mock_feature

        mock_post.return_value = MockResponse(
            status_code=200,
            json_data={"ranked_ids": ["1", "2", "3"], "scores": [0.95, 0.85, 0.75]},
        )

        result = await recommend(
            "mi cay",
            "user-1",
            db,
            query_vector=[0.1] * 768,
            search_mode="emotion",
        )

        feature_candidates = mock_feature.build_integer_features.call_args.args[0]
        assert [c.id for c in feature_candidates] == ["2", "3", "1"]
        assert [c.id for c in result["results"]] == ["1", "2", "3"]

@pytest.mark.asyncio
async def test_recommend_ai_engine_down_falls_back_gracefully():
    db = MagicMock()
    candidates = [
        DummyCandidate(id="1", distance=0.1),
        DummyCandidate(id="2", distance=0.15),
        DummyCandidate(id="3", distance=0.2),
        DummyCandidate(id="4", distance=0.25)
    ]
    with patch("app.services.recommendation_service.get_user_allergies", return_value=[]), \
         patch("app.services.recommendation_service.get_user_preferences_vector", return_value=None), \
         patch("app.services.recommendation_service.RetrievalService") as mock_retrieval_cls, \
         patch("app.services.recommendation_service.annotate_allergy", return_value=(candidates, 0)), \
         patch("app.services.recommendation_service.FeatureService") as mock_feature_cls, \
         patch("httpx.AsyncClient.post", new_callable=AsyncMock, side_effect=Exception("Connection error")):
         
        mock_retrieval = MagicMock()
        mock_retrieval.get_candidates.return_value = candidates
        mock_retrieval_cls.return_value = mock_retrieval

        result = await recommend("mì cay", "user-1", db, query_vector=[0.1]*768)
        # Should return safe candidates directly in original retrieval order
        assert len(result["results"]) == 4
        assert result["results"] == candidates

def test_apply_sentiment_search_boost():
    candidates = [
        DummyCandidate(id="1", distance=0.1, rating_avg=4.5, total_reviews=10, sentiment_score=0.8),
        DummyCandidate(id="2", distance=0.2, rating_avg=4.8, total_reviews=20, sentiment_score=0.9),
        DummyCandidate(id="3", distance=0.3, rating_avg=3.5, total_reviews=5, sentiment_score=0.2)
    ]
    boosted = _apply_sentiment_search_boost(candidates)
    
    # Assert they are sorted by sentiment_search_score descending
    assert len(boosted) == 3
    assert boosted[0].sentiment_search_score >= boosted[1].sentiment_search_score
    assert boosted[1].sentiment_search_score >= boosted[2].sentiment_search_score
