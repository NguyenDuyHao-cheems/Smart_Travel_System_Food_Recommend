from pydantic import BaseModel, Field
from typing import List, Optional

class ExtractIntentRequest(BaseModel):
    text: str = Field(..., max_length=1000, description="Natural language food query")
    lat: Optional[float] = Field(None, description="Optional user latitude")
    lng: Optional[float] = Field(None, description="Optional user longitude")


class ExtractIntentResponse(BaseModel):
    raw_text: str
    cleaned_query: str = Field(..., description="Query đã được Gemini làm sạch, dùng để embed")
    vector: List[float] = Field(..., description="The generated embedded vector representation of the text")
    lat: Optional[float] = None
    lng: Optional[float] = None

class EmbedRequest(BaseModel):
    text: str = Field(..., max_length=2000, description="Text to embed")

class EmbedResponse(BaseModel):
    vector: List[float] = Field(..., description="The generated embedded vector representation of the text")
