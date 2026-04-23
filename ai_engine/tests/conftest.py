"""
conftest.py – shared fixtures for ai_engine tests.

Strategy:
- Stub `torch` and `transformers` in sys.modules BEFORE any app code is imported.
  This lets all integration tests run locally without GPU libraries installed.
- Mock `generate_mean_pooled_embedding` to return a fixed 768-dim float list.
- The TestClient spins up FastAPI in-process, no Docker needed.
"""

import sys
import types
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Pre-stub heavy ML libraries so they never actually load
# ---------------------------------------------------------------------------

def _stub_torch():
    """Inject a fake 'torch' module into sys.modules."""
    if "torch" in sys.modules:
        return  # Already present (e.g. running inside Docker)

    torch_mock = types.ModuleType("torch")
    torch_mock.no_grad = MagicMock(return_value=MagicMock(__enter__=MagicMock(return_value=None), __exit__=MagicMock(return_value=False)))
    torch_mock.Tensor = MagicMock
    torch_mock.FloatTensor = MagicMock
    torch_mock.long = MagicMock()
    sys.modules["torch"] = torch_mock


def _stub_transformers():
    """Inject a fake 'transformers' module into sys.modules."""
    if "transformers" in sys.modules:
        return

    transformers_mock = types.ModuleType("transformers")
    transformers_mock.AutoTokenizer = MagicMock()
    transformers_mock.RobertaModel = MagicMock()
    sys.modules["transformers"] = transformers_mock


# Stub BEFORE any app imports
_stub_torch()
_stub_transformers()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

EMBEDDING_DIM = 768
DUMMY_EMBEDDING = [0.1] * EMBEDDING_DIM


@pytest.fixture(scope="session")
def mock_embedding():
    """Patch generate_mean_pooled_embedding at the point of use in the router."""
    # Import after stubs are in place
    import app.nlp.embeddings  # noqa: F401

    with patch(
        "app.nlp.embeddings.generate_mean_pooled_embedding",
        return_value=DUMMY_EMBEDDING,
    ) as _mock:
        yield _mock


@pytest.fixture(scope="session")
def client(mock_embedding):
    """Session-scoped FastAPI TestClient — model is fully mocked."""
    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def tmp_ranker(tmp_path_factory):
    """
    Session-scoped LambdaMARTRanker using a temp model path.
    Trains once on heuristic synthetic data — reused across all ranking tests.
    """
    model_path = tmp_path_factory.mktemp("models") / "test_lambdamart.lgb"
    from app.ranking.lambdamart import LambdaMARTRanker
    return LambdaMARTRanker(model_path=str(model_path))


@pytest.fixture(scope="session")
def ranking_client(mock_embedding, tmp_ranker):
    """
    FastAPI TestClient with the ranking dependency overridden to use tmp_ranker.
    Depends on mock_embedding so NLP stubs are active.
    """
    from app.main import app
    from app.ranking.router import get_ranker

    app.dependency_overrides[get_ranker] = lambda: tmp_ranker
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def sample_candidates():
    """10 candidates with ascending similarity scores for deterministic tests."""
    return [
        {
            "res_id": i,
            "similarity_score": round(i * 0.09, 2),
            "rating": 3.0 + (i % 3) * 0.5,
            "sentiment_score": round((i % 5) * 0.1 - 0.2, 1),
            "distance_km": float(i),
            "price_normalized": round(0.5 + i * 0.05, 2),
            "review_count": i * 10,
        }
        for i in range(1, 11)
    ]
