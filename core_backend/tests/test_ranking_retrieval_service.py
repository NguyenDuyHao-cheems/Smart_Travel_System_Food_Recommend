from sqlalchemy.dialects import postgresql

from app.domains.ranking.retrieval_service import RetrievalService


class DummyQuery:
    def __init__(self):
        self.filters = []
        self.order_by_clauses = []
        self.limit_value = None

    def filter(self, *criteria):
        self.filters.extend(criteria)
        return self

    def add_columns(self, *columns):
        return self

    def join(self, *args, **kwargs):
        return self

    def options(self, *args, **kwargs):
        return self

    def order_by(self, *clauses):
        self.order_by_clauses.extend(clauses)
        return self

    def distinct(self):
        return self

    def limit(self, value):
        self.limit_value = value
        return self

    def count(self):
        return 0

    def all(self):
        return []


class DummySession:
    def __init__(self):
        self.query_obj = DummyQuery()
        self.model = None

    def query(self, *models):
        self.model = models[0] if models else None
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


def _compiled_order_sql(query):
    """Compile order_by clauses. Uses non-literal mode to avoid vector rendering."""
    return " ".join(
        str(
            clause.compile(
                dialect=postgresql.dialect(),
            )
        )
        for clause in query.order_by_clauses
    )


# -------------------------------------------------------------------
# Budget filter tests (existing)
# -------------------------------------------------------------------


def test_get_candidates_adds_budget_filter_to_postgres_query():
    db = DummySession()
    service = RetrievalService(db)

    service.get_candidates(
        budget=50_000,
    )

    sql = _compiled_filter_sql(db.query_obj)

    assert "price_min" in sql
    assert "price_max" in sql
    assert "50000" in sql


def test_get_candidates_skips_budget_filter_when_budget_is_zero():
    db = DummySession()
    service = RetrievalService(db)

    service.get_candidates(
        budget=0,
    )

    sql = _compiled_filter_sql(db.query_obj)

    assert "price_min" not in sql
    assert "price_max" not in sql


def test_get_candidates_adds_viewport_filter_when_bounds_are_present():
    db = DummySession()
    service = RetrievalService(db)

    service.get_candidates(
        budget=0,
        viewport_bounds={
            "north": 10.9,
            "south": 10.7,
            "east": 106.9,
            "west": 106.5,
        },
    )

    sql = _compiled_filter_sql(db.query_obj)

    assert "restaurants.lat IS NOT NULL" in sql
    assert "restaurants.lng IS NOT NULL" in sql
    assert "restaurants.lat BETWEEN 10.7 AND 10.9" in sql
    assert "restaurants.lng BETWEEN 106.5 AND 106.9" in sql


# -------------------------------------------------------------------
# Semantic ordering tests (new — query_vector)
# -------------------------------------------------------------------


def test_get_candidates_with_query_vector_orders_by_cosine_distance():
    """Khi có query_vector → ORDER BY cosine_distance, filter NOT NULL."""
    db = DummySession()
    service = RetrievalService(db)
    fake_vector = [0.1] * 768

    service.get_candidates(
        budget=0,
        query_vector=fake_vector,
    )

    filter_sql = _compiled_filter_sql(db.query_obj)
    assert "embedding_vector IS NOT NULL" in filter_sql

    order_sql = _compiled_order_sql(db.query_obj)
    assert "<=>" in order_sql or "cosine_distance" in order_sql.lower()


def test_get_candidates_without_query_vector_orders_by_rating():
    """Khi không có query_vector → ORDER BY rating_avg DESC."""
    db = DummySession()
    service = RetrievalService(db)

    service.get_candidates(
        budget=0,
    )

    order_sql = _compiled_order_sql(db.query_obj)
    assert "rating_avg" in order_sql

    filter_sql = _compiled_filter_sql(db.query_obj)
    assert "embedding_vector" not in filter_sql
