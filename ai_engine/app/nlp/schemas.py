from pydantic import BaseModel, Field
from typing import List, Optional

class ExtractIntentRequest(BaseModel):
    text: str = Field(..., max_length=1000, description="Natural language food query")
    lat: Optional[float] = Field(None, description="Optional user latitude")
    lng: Optional[float] = Field(None, description="Optional user longitude")


class ExtractIntentResponse(BaseModel):
    raw_text: str
    tags: List[str]
    budget: Optional[int] = None
    vector: List[float] = Field(..., description="The generated embedded vector representation of the text")
    intent: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
