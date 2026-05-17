from types import SimpleNamespace

from app.domains.ranking.feature_service import FeatureService
from app.services.recommendation_service import _apply_sentiment_search_boost
from app.services.review_sentiment import (
    aggregate_restaurant_sentiment,
    analyze_review_sentiment,
    normalize_restaurant_sentiment,
)


def test_analyze_review_sentiment_detects_positive_review():
    result = analyze_review_sentiment(
        "Quán rất ngon, phục vụ nhiệt tình, sạch sẽ. Sẽ quay lại!",
        rating=5,
    )

    assert result.label == "positive"
    assert result.score > 0.4
    assert result.confidence > 0.5


def test_analyze_review_sentiment_detects_negative_review():
    result = analyze_review_sentiment(
        "Đồ ăn không ngon, phục vụ quá lâu và thái độ khó chịu.",
        rating=2,
    )

    assert result.label == "negative"
    assert result.score < -0.2


def test_aggregate_restaurant_sentiment_uses_smoothing():
    sentiments = [
        analyze_review_sentiment("Ngon và sạch sẽ", rating=5),
        analyze_review_sentiment("Phục vụ tốt, sẽ quay lại", rating=5),
    ]

    summary = aggregate_restaurant_sentiment(sentiments, smoothing_reviews=5)

    assert summary.positive_count == 2
    assert summary.analyzed_count == 2
    assert 0.0 < summary.sentiment_score < 1.0


def test_normalize_restaurant_sentiment_accepts_new_and_legacy_scales():
    assert normalize_restaurant_sentiment(0.6) == 0.6
    assert normalize_restaurant_sentiment(5.0) == 0.0
    assert normalize_restaurant_sentiment(10.0) == 1.0
    assert normalize_restaurant_sentiment(0.0) == 0.0


def test_feature_service_scales_sentiment_to_minus_100_100():
    candidate = SimpleNamespace(
        id="res-1",
        lat=10.0,
        lng=106.0,
        price_range="50000",
        rating_avg=4.5,
        sentiment_score=0.75,
        total_reviews=20,
        distance=0.2,
        is_open_now=True,
        tag_match=False,
        name="Quan ngon",
    )

    features = FeatureService().build_integer_features(
        [candidate],
        user_lat=10.0,
        user_lng=106.0,
        budget=100_000,
    )

    assert features[0]["sentiment_score"] == 75


def test_emotion_search_sentiment_boost_prefers_better_review_sentiment_when_semantic_is_close():
    negative = SimpleNamespace(
        id="negative",
        distance=0.12,
        sentiment_score=-0.8,
        total_reviews=80,
        rating_avg=4.0,
    )
    positive = SimpleNamespace(
        id="positive",
        distance=0.14,
        sentiment_score=0.9,
        total_reviews=80,
        rating_avg=4.0,
    )

    ranked = _apply_sentiment_search_boost([negative, positive])

    assert ranked[0].id == "positive"
    assert ranked[0].sentiment_search_score > ranked[1].sentiment_search_score
