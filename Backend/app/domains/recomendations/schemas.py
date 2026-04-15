from pydantic import BaseModel
from typing import List, Optional


class QueryParserRequest(BaseModel):
    text: str
    lat: Optional[float] = None
    lng: Optional[float] = None


class QueryParserResponse(BaseModel):
    raw_text: str
    tags: List[str]
    budget: Optional[int] = None
    query_vector: List[float]
    lat: Optional[float] = None
    lng: Optional[float] = None