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
    torch_mock.__spec__ = MagicMock()
    sys.modules["torch"] = torch_mock


def _stub_sentence_transformers():
    """Inject a fake 'sentence_transformers' module into sys.modules."""
    if "sentence_transformers" in sys.modules:
        return

    st_mock = types.ModuleType("sentence_transformers")
    st_mock.SentenceTransformer = MagicMock()
    sys.modules["sentence_transformers"] = st_mock


def _stub_lightgbm():
    """Inject a fake 'lightgbm' module into sys.modules."""
    if "lightgbm" in sys.modules:
        return

    lgb_mock = types.ModuleType("lightgbm")

    class MockBooster:
        def __init__(self, model_file=None, *args, **kwargs):
            self.model_file = model_file
            if model_file:
                import pathlib
                p = pathlib.Path(model_file)
                if p.exists() and p.read_text() == "not a valid model file":
                    raise Exception("LightGBM error: Cannot open model file")

        def predict(self, X):
            import numpy as np
            # Return some random scores or deterministic decreasing scores
            return np.linspace(1.0, 0.1, len(X), dtype=np.float32)

        def save_model(self, path):
            import pathlib
            pathlib.Path(path).parent.mkdir(parents=True, exist_ok=True)
            pathlib.Path(path).write_text("dummy booster data")

    class MockDataset:
        def __init__(self, data, label=None, group=None, feature_name=None, free_raw_data=False):
            pass

    def mock_train(params, train_set, num_boost_round=100, valid_sets=None, callbacks=None):
        return MockBooster()

    def mock_log_evaluation(period=20):
        return lambda x: None

    lgb_mock.Booster = MockBooster
    lgb_mock.Dataset = MockDataset
    lgb_mock.train = mock_train
    lgb_mock.log_evaluation = mock_log_evaluation
    lgb_mock.__spec__ = MagicMock()
    sys.modules["lightgbm"] = lgb_mock


def _stub_lightfm():
    """Inject a fake 'lightfm' module into sys.modules."""
    if "lightfm" in sys.modules:
        return

    lfm_mock = types.ModuleType("lightfm")
    lfm_mock.LightFM = MagicMock()
    lfm_mock.__spec__ = MagicMock()
    sys.modules["lightfm"] = lfm_mock


# Stub BEFORE any app imports
_stub_torch()
_stub_sentence_transformers()
_stub_lightgbm()
_stub_lightfm()


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
    FastAPI TestClient với ranking dependency được override để dùng tmp_ranker.
    Dùng AIRankingService.rank() nhưng inject LambdaMARTRanker từ tmp_ranker.
    """
    from app.main import app
    from app.ranking.router import get_ranking_service
    from app.ranking.service import AIRankingService

    # Tạo AIRankingService với lambdamart là tmp_ranker (trained)
    class TestAIRankingService(AIRankingService):
        def __init__(self):
            from app.ranking.lightfm_inference import LightFMInference
            self.lightfm = LightFMInference()  # OK nếu model không tồn tại → fallback=0
            self.lambdamart = tmp_ranker         # inject trained ranker

    test_service = TestAIRankingService()
    app.dependency_overrides[get_ranking_service] = lambda: test_service
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def sample_candidates():
    """10 candidates with ascending similarity scores for deterministic tests."""
    return [
        {
            "res_id": str(i),              # str (UUID-compatible)
            "similarity_score": int(i * 9),   # 0-81 range
            "rating": 300 + (i % 3) * 50,    # 300-400 int
            "sentiment_score": int((i % 5) * 10 - 20),  # -20 to 20
            "distance_m": i * 1000,           # 0-9000 m
            "price_normalized": 50 + i * 5,   # 50-95
            "review_count": i * 10,
        }
        for i in range(1, 11)
    ]
