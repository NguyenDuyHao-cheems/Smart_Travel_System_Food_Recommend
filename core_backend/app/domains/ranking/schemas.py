from pydantic import BaseModel
from typing import List

class Candidate(BaseModel):
    res_id: int
    vector: List[float]  # embedding của restaurant

class RankRequest(BaseModel):
    pref_vector: List[float]
    candidates: List[Candidate]

class RankResponse(BaseModel):
    top_ids: List[int]
