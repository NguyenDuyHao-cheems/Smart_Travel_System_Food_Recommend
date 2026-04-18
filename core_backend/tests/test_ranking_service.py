import pytest
import numpy as np
from unittest.mock import MagicMock
from app.domains.ranking.service import RankingService, RetrievalService
from app.domains.ranking.schemas import Candidate

@pytest.fixture
def sample_candidates():
    return [
        Candidate(res_id=1, vector=[1.0, 0.0, 0.0]),
        Candidate(res_id=2, vector=[0.0, 1.0, 0.0]),
        Candidate(res_id=3, vector=[0.7, 0.7, 0.0])
    ]

class TestRankingService:
    def test_build_cache_and_rank_happy_path(self, sample_candidates):
        service = RankingService()
        pref_vector = [1.0, 0.0, 0.0]
        key = service.get_key(pref_vector)

        # Build cache
        service.build_cache(key, pref_vector, sample_candidates)
        
        # ID 1 is identical to [1,0,0], ID 3 is 45 degrees, ID 2 is 90 degrees
        assert service.cache[key] == [1, 3, 2]
        
        # Test rank method with offset and limit
        top_ids = service.rank(pref_vector, sample_candidates, k=2, offset=0)
        assert top_ids == [1, 3]

        # Test pagination
        top_ids_page_2 = service.rank(pref_vector, sample_candidates, k=2, offset=2)
        assert top_ids_page_2 == [2]

    def test_build_cache_zero_norm_vector(self, sample_candidates):
        service = RankingService()
        pref_vector = [0.0, 0.0, 0.0]
        key = service.get_key(pref_vector)
        service.build_cache(key, pref_vector, sample_candidates)
        assert service.cache[key] == []

    def test_build_cache_empty_candidates(self):
        service = RankingService()
        pref_vector = [1.0, 0.0, 0.0]
        key = service.get_key(pref_vector)
        service.build_cache(key, pref_vector, [])
        assert service.cache[key] == []

    def test_clear_cache(self, sample_candidates):
        service = RankingService()
        pref_vector = [1.0, 0.0, 0.0]
        key = service.get_key(pref_vector)
        service.build_cache(key, pref_vector, sample_candidates)
        assert key in service.cache
        
        service.clear_cache(pref_vector)
        assert key not in service.cache

class TestRetrievalService:
    def test_parse_vector(self):
        service = RetrievalService(db=MagicMock())
        assert service._parse_vector("[1.0, 2.0]") == [1.0, 2.0]
        assert service._parse_vector([1.0, 2.0]) == [1.0, 2.0]
        assert service._parse_vector(None) == []
        assert service._parse_vector("invalid json") == []
