import pytest
from pydantic import ValidationError

from app.domains.search.schemas import RecommendResult, SearchRecommendResponse


def make_result() -> RecommendResult:
    return RecommendResult(
        id="1",
        name="Quan An Test",
        match="95%",
        dist="1.2 km",
        price="45k - 60k",
        rating="4.8",
        reason="Phu hop voi bo loc hien tai.",
        img="/images/test.jpg",
    )


def test_search_recommend_response_accepts_non_negative_metadata():
    response = SearchRecommendResponse(
        results=[make_result()],
        fallback_applied=True,
        fallback_reason="Relaxed filters.",
        applied_budget=60_000,
    )

    assert response.applied_budget == 60_000


@pytest.mark.parametrize(
    ("field_name", "field_value"),
    [
        ("applied_budget", -10_000),
    ],
)
def test_search_recommend_response_rejects_negative_metadata(field_name, field_value):
    payload = {
        "results": [make_result().model_dump()],
        "fallback_applied": True,
        "fallback_reason": "Relaxed filters.",
        "applied_budget": 60_000,
    }
    payload[field_name] = field_value

    with pytest.raises(ValidationError):
        SearchRecommendResponse(**payload)
