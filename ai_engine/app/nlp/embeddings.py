from fastapi import APIRouter 
from .schemas import NLPRequest, NLPResponse, ExtractIntentRequest, ExtractIntentResponse
from .extractor import extract_intent_and_budget
from .query_parser import extract_budget, extract_tags
from .service import generate_mean_pooled_embedding

router = APIRouter()



@router.post("/process", response_model=NLPResponse)
def process_nlp(request: NLPRequest):
    """
    Takes user text, extracts intents and budget, and returns a 
    PhoBERT vector embedding.
    """
    # 1. Extract intents & budget
    extracted_data = extract_intent_and_budget(request.text)
    
    # 2. Generate vector embeddings
    embeddings = generate_mean_pooled_embedding(request.text)
        
    return NLPResponse(
        vector=embeddings,
        extracted_budget=extracted_data["extracted_budget"],
        intent=extracted_data["intent"]
    )

@router.post("/extract-intent", response_model=ExtractIntentResponse)
def extract_intent(request: ExtractIntentRequest):
    tags = extract_tags(request.text)
    budget = extract_budget(request.text)

    query_vector = generate_mean_pooled_embedding(request.text)

    return ExtractIntentResponse(
        raw_text=request.text,
        tags=tags,
        budget=budget,
        query_vector=query_vector,
        lat=request.lat,
        lng=request.lng,
    )
