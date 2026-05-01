from sqlalchemy.dialects import postgresql

from app.domains.ranking.retrieval_service import RetrievalService


class DummyQuery:
    def __init__(self):
        self.filters = []
        self.limit_value = None

    def filter(self, *criteria):
        self.filters.extend(criteria)
        return self

    def join(self, *args, **kwargs):
        return self

    def distinct(self):
        return self

    def limit(self, value):
        self.limit_value = value
        return self

    def all(self):
        return []


class DummySession:
    def __init__(self):
        self.query_obj = DummyQuery()
        self.model = None

    def query(self, model):
        self.model = model
        return self.query_obj


def _compiled_filter_sql(query):
    return " ".join(
        str(
            criteria.compile(
                dialect=postgresql.dialect(),
                compile_kwargs={"literal_binds": True},
            )
        )
        for criteria in query.filters
    )


def test_get_candidates_adds_budget_filter_to_postgres_query():
    db = DummySession()
    service = RetrievalService(db)

    service.get_candidates(
        tags=[],
        budget=50_000,
        user_location=[10.87, 106.80],
        radius=5.0,
    )

    sql = _compiled_filter_sql(db.query_obj)

    assert "price_range IS NOT NULL" in sql
    assert "split_part" in sql
    assert "<= 50000" in sql


def test_get_candidates_skips_budget_filter_when_budget_is_zero():
    db = DummySession()
    service = RetrievalService(db)

    service.get_candidates(
        tags=[],
        budget=0,
        user_location=[10.87, 106.80],
        radius=5.0,
    )

    sql = _compiled_filter_sql(db.query_obj)

    assert "split_part" not in sql
    assert "price_range IS NOT NULL" not in sql
