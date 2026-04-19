from pydantic import BaseModel, Field
from typing import List, Optional

class NLPRequest(BaseModel):
    """
    Schema for the ai_engine to receive raw text from the core_backend.
    """
    text: str = Field(..., max_length=1000, description="The raw user text to be processed")

class NLPResponse(BaseModel):
    """
    Schema representing the structured AI output to be sent back to core_backend.
    """
    vector: List[float] = Field(..., description="The generated embedded vector representation of the text")
    extracted_budget: Optional[float] = Field(None, description="The budget extracted from the text, if any")
    intent: Optional[str] = Field(None, description="The extracted intent of the user search")
class ExtractIntentRequest(BaseModel):
    text: str = Field(..., max_length=1000, description="Natural language food query")
    lat: Optional[float] = Field(None, description="Optional user latitude")
    lng: Optional[float] = Field(None, description="Optional user longitude")
    allergies: List[str] = Field(
        default_factory=list,
        description="User allergen list used to filter candidates before ranking (e.g. ['peanut', 'milk']).",
    )


class ExtractIntentResponse(BaseModel):
    raw_text: str
    tags: List[str]
    budget: Optional[int] = None
    query_vector: List[float]
    lat: Optional[float] = None
    lng: Optional[float] = None
    allergies: List[str] = Field(
        default_factory=list,
        description="Normalised allergen list echoed back for downstream pipeline use.",
    )
    filtered_count: int = Field(
        0,
        description="Number of candidates removed by the allergy filter (0 when no candidates provided).",
    )
