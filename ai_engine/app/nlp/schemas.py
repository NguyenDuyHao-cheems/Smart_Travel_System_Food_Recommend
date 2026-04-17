from pydantic import BaseModel, Field
from typing import List, Optional

class NLPRequest(BaseModel):
    """
    Schema for the ai_engine to receive raw text from the core_backend.
    """
    text: str = Field(..., description="The raw user text to be processed")

class NLPResponse(BaseModel):
    """
    Schema representing the structured AI output to be sent back to core_backend.
    """
    vector: List[float] = Field(..., description="The generated embedded vector representation of the text")
    extracted_budget: Optional[float] = Field(None, description="The budget extracted from the text, if any")
    intent: Optional[str] = Field(None, description="The extracted intent of the user search")
