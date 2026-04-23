from fastapi import APIRouter 
from .schemas import ExtractIntentRequest, ExtractIntentResponse
from .query_parser import extract_budget, extract_tags
from .service import generate_mean_pooled_embedding

router = APIRouter()



@router.post("/extract-intent", response_model=ExtractIntentResponse)
def extract_intent(request: ExtractIntentRequest):
    """
    Unified endpoint to extract tags, budget, intent and generate embeddings.
    """
    tags = extract_tags(request.text)
    budget = extract_budget(request.text)
    vector = generate_mean_pooled_embedding(request.text)
    
    # Tạm thời sử dụng hard code , có thể cải tiến sau
    intent = "search_food"

    return ExtractIntentResponse(
        raw_text=request.text,
        tags=tags,
        budget=budget,
        vector=vector,
        intent=intent,
        lat=request.lat,
        lng=request.lng,
    )
