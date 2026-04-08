from pydantic import BaseModel, Field
from typing import List, Optional

class SearchRequest(BaseModel):
    """
    Schema for the core backend to receive a user search query.
    """
    query: str = Field(..., description="The user's raw text search query")

class AISearchPayload(BaseModel):
    """
    Schema representing the payload sent to the ai_engine for processing.
    """
    text: str = Field(..., description="The raw text to be processed by the AI engine")

class AIResponseData(BaseModel):
    """
    Schema representing the structured response returned by the ai_engine.
    """
    vector: List[float] = Field(..., description="The generated embedded vector representation of the text")
    extracted_budget: Optional[float] = Field(None, description="The budget extracted from the text, if any")
    intent: Optional[str] = Field(None, description="The extracted intent of the user search")
