from __future__ import annotations

import math
import re
import unicodedata
from dataclasses import dataclass
from typing import Iterable, Optional


SENTIMENT_MODEL_NAME = "rule-based-vi-v1"

_POSITIVE_TERMS = {
    "ngon",
    "rat ngon",
    "qua ngon",
    "tuyet voi",
    "hai long",
    "de thuong",
    "than thien",
    "nhiet tinh",
    "sach",
    "sach se",
    "thoang",
    "re",
    "hop ly",
    "dang tien",
    "se quay lai",
    "recommend",
    "nen thu",
    "on ap",
    "xuat sac",
    "chat luong",
    "nhanh",
    "phuc vu tot",
}

_NEGATIVE_TERMS = {
    "te",
    "rat te",
    "qua te",
    "do_bad",
    "do_bad te",
    "do te",
    "khong ngon",
    "that vong",
    "hoi han",
    "mac",
    "dat",
    "ban",
    "mat ve sinh",
    "lau",
    "cho lau",
    "thai do",
    "kho chiu",
    "khong quay lai",
    "khong nen",
    "chan",
    "nhat",
    "nguoi",
    "lanh tanh",
    "kem",
    "phuc vu kem",
}

_NEGATION_TOKENS = {"khong", "kh", "chua", "chang", "ko", "k"}
_NEGATION_BRIDGES = {"he", "co", "qua", "may", "thay"}
_NEGATION_WINDOW = 3


@dataclass(frozen=True)
class ReviewSentiment:
    label: str
    score: float
    confidence: float
    model: str = SENTIMENT_MODEL_NAME


@dataclass(frozen=True)
class RestaurantSentimentSummary:
    sentiment_score: float
    positive_count: int
    neutral_count: int
    negative_count: int
    analyzed_count: int


def normalize_vietnamese(text: str) -> str:
    if not text:
        return ""
    lowered = re.sub(r"\bdở\b", "do_bad", text.lower())
    normalized = unicodedata.normalize("NFD", lowered)
    normalized = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    normalized = normalized.replace("đ", "d")
    return re.sub(r"\s+", " ", normalized).strip()


def analyze_review_sentiment(text: Optional[str], rating: Optional[float] = None) -> ReviewSentiment:
    """
    Lightweight Vietnamese review sentiment analyzer.

    Scores use the project-wide scale:
      - -1.0 = strongly negative
      -  0.0 = neutral
      -  1.0 = strongly positive

    Rating is only a weak fallback/secondary signal because the feature is meant
    to be grounded in review text first.
    """
    normalized = normalize_vietnamese(text or "")
    text_score = _score_text(normalized)
    rating_score = _score_rating(rating)

    if normalized and rating_score is not None:
        score = (0.75 * text_score) + (0.25 * rating_score)
    elif normalized:
        score = text_score
    elif rating_score is not None:
        score = rating_score
    else:
        score = 0.0

    score = _clamp(score, -1.0, 1.0)
    label = _label_for_score(score)
    confidence = _confidence_for_score(score, normalized)
    return ReviewSentiment(label=label, score=round(score, 4), confidence=confidence)


def aggregate_restaurant_sentiment(
    reviews: Iterable[ReviewSentiment],
    global_average: float = 0.0,
    smoothing_reviews: int = 5,
) -> RestaurantSentimentSummary:
    review_list = list(reviews)
    if not review_list:
        return RestaurantSentimentSummary(
            sentiment_score=round(global_average, 4),
            positive_count=0,
            neutral_count=0,
            negative_count=0,
            analyzed_count=0,
        )

    weighted_sum = sum(r.score * max(r.confidence, 0.05) for r in review_list)
    total_weight = sum(max(r.confidence, 0.05) for r in review_list)
    average = weighted_sum / total_weight if total_weight else 0.0

    # Bayesian smoothing keeps restaurants with only one glowing review from
    # overpowering places with a larger, steadier body of reviews.
    adjusted = (
        (average * len(review_list)) + (global_average * smoothing_reviews)
    ) / (len(review_list) + smoothing_reviews)

    return RestaurantSentimentSummary(
        sentiment_score=round(_clamp(adjusted, -1.0, 1.0), 4),
        positive_count=sum(1 for r in review_list if r.label == "positive"),
        neutral_count=sum(1 for r in review_list if r.label == "neutral"),
        negative_count=sum(1 for r in review_list if r.label == "negative"),
        analyzed_count=len(review_list),
    )


def normalize_restaurant_sentiment(raw_value: Optional[float]) -> float:
    """
    Normalize restaurant sentiment to [-1, 1].

    New data should already be stored in [-1, 1]. This also tolerates legacy
    neutral=5.0 data by mapping the old 0..10 scale to -1..1.
    """
    if raw_value is None:
        return 0.0
    value = float(raw_value)
    if -1.0 <= value <= 1.0:
        return value
    if 0.0 <= value <= 10.0:
        return _clamp((value - 5.0) / 5.0, -1.0, 1.0)
    return _clamp(value, -1.0, 1.0)


def sentiment_label_for_score(score: Optional[float]) -> str:
    return _label_for_score(normalize_restaurant_sentiment(score))


def sentiment_confidence_from_review_count(total_reviews: Optional[int]) -> float:
    count = max(0, int(total_reviews or 0))
    if count == 0:
        return 0.0
    return round(min(1.0, math.log1p(count) / math.log1p(100)), 4)


def _score_text(normalized: str) -> float:
    if not normalized:
        return 0.0

    positive_hits = 0
    negative_hits = 0

    for match in _find_sentiment_matches(normalized):
        polarity = match["polarity"]
        if match["negated"]:
            polarity *= -1

        if polarity > 0:
            positive_hits += 1
        elif polarity < 0:
            negative_hits += 1

    raw = positive_hits - negative_hits
    if raw == 0:
        return 0.0
    return math.tanh(raw / 2.0)


def _score_rating(rating: Optional[float]) -> Optional[float]:
    if rating is None:
        return None
    try:
        value = float(rating)
    except (TypeError, ValueError):
        return None
    if value <= 0:
        return None
    normalized = ((min(value, 5.0) - 3.0) / 2.0)
    return _clamp(normalized, -1.0, 1.0)


def _find_sentiment_matches(text: str) -> list[dict[str, int | bool]]:
    tokens = re.findall(r"\w+", text)
    if not tokens:
        return []

    term_specs = [
        (tuple(term.split()), 1, term.split()[0] in _NEGATION_TOKENS)
        for term in _POSITIVE_TERMS
    ] + [
        (tuple(term.split()), -1, term.split()[0] in _NEGATION_TOKENS)
        for term in _NEGATIVE_TERMS
    ]
    term_specs.sort(key=lambda spec: len(spec[0]), reverse=True)

    occupied: set[int] = set()
    matches: list[dict[str, int | bool]] = []

    for index in range(len(tokens)):
        if index in occupied:
            continue

        for term_tokens, polarity, includes_negation in term_specs:
            end = index + len(term_tokens)
            if end > len(tokens) or any(pos in occupied for pos in range(index, end)):
                continue
            if tuple(tokens[index:end]) != term_tokens:
                continue

            for pos in range(index, end):
                occupied.add(pos)
            matches.append(
                {
                    "polarity": polarity,
                    "negated": False if includes_negation else _has_negation_before(tokens, index),
                }
            )
            break

    return matches


def _has_negation_before(tokens: list[str], start_index: int) -> bool:
    lower_bound = max(0, start_index - _NEGATION_WINDOW)
    for negation_index in range(start_index - 1, lower_bound - 1, -1):
        if tokens[negation_index] not in _NEGATION_TOKENS:
            continue
        bridge_tokens = tokens[negation_index + 1:start_index]
        return all(token in _NEGATION_BRIDGES for token in bridge_tokens)
    return False


def _label_for_score(score: float) -> str:
    if score >= 0.2:
        return "positive"
    if score <= -0.2:
        return "negative"
    return "neutral"


def _confidence_for_score(score: float, normalized_text: str) -> float:
    if not normalized_text:
        return 0.35 if abs(score) > 0 else 0.1
    length_factor = min(1.0, len(normalized_text) / 160.0)
    polarity_factor = min(1.0, abs(score))
    return round(_clamp(0.35 + (0.35 * polarity_factor) + (0.30 * length_factor), 0.05, 1.0), 4)


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))
