from types import SimpleNamespace

from app.domains.tagging.rules import TagRuleEngine


def test_infer_spicy_tag_from_dish_name():
    engine = TagRuleEngine()

    restaurant = SimpleNamespace(
        name="Mi Cay Sasin",
        price_range="40k - 80k",
        rating_avg=4.8,
        sentiment_score=0.9,
    )
    dishes = [SimpleNamespace(name="mi cay hai san")]
    reviews = []

    tags = engine.infer_tags(restaurant, dishes, reviews)

    assert "spicy" in tags
    assert "high_rating" in tags
    assert len(tags) >= 3


def test_fallback_tags_when_no_data():
    engine = TagRuleEngine()

    restaurant = SimpleNamespace(
        name="",
        price_range="",
        rating_avg=None,
        sentiment_score=None,
    )

    tags = engine.infer_tags(restaurant, [], [])

    assert len(tags) >= 3
    assert "restaurant" in tags


def test_limit_to_max_five_tags():
    engine = TagRuleEngine()

    restaurant = SimpleNamespace(
        name="Mi cay hai san view dep",
        price_range="30k - 50k",
        rating_avg=4.9,
        sentiment_score=0.9,
    )
    dishes = [
        SimpleNamespace(name="mi cay tom muc cua bun pho com chay tra sua")
    ]
    reviews = [SimpleNamespace(text="khong gian dep check-in tot")]

    tags = engine.infer_tags(restaurant, dishes, reviews)

    assert len(tags) <= 5
