from fastapi import APIRouter 
from .schemas import ExtractIntentRequest, ExtractIntentResponse
from .llm_parser import parse_query_with_gemini
from .service import generate_mean_pooled_embedding

router = APIRouter()



@router.post("/extract-intent", response_model=ExtractIntentResponse)
def extract_intent(request: ExtractIntentRequest):
    """
    Unified endpoint to extract tags, budget, intent using Gemini API and generate embeddings.
    """
    # Dùng Gemini phân tích query để hiểu tâm trạng và ngữ cảnh
    tags, budget, intent = parse_query_with_gemini(request.text)
    
    # Tạo vector embedding cho search thông thường
    vector = generate_mean_pooled_embedding(request.text)

    return ExtractIntentResponse(
        raw_text=request.text,
        tags=tags,
        budget=budget,
        vector=vector,
        intent=intent,
        lat=request.lat,
        lng=request.lng,
    )
