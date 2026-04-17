from fastapi import APIRouter 
from .schemas import NLPRequest, NLPResponse, ExtractIntentRequest, ExtractIntentResponse
from .extractor import extract_intent_and_budget
from .query_parser import extract_budget, extract_tags
import torch
from .model_provider import get_tokenizer_and_model

router = APIRouter()



@router.post("/process", response_model=NLPResponse)
async def process_nlp(request: NLPRequest):
    """
    Takes user text, extracts intents and budget, and returns a 
    PhoBERT vector embedding.
    """
    tokenizer, model = get_tokenizer_and_model()

    # 1. Extract intents & budget
    extracted_data = extract_intent_and_budget(request.text)
    
    # 2. Generate vector embeddings
    inputs = tokenizer(request.text, return_tensors="pt", padding=True, truncation=True)
    with torch.no_grad():
        outputs = model(**inputs)
        # Using mean pooling on the last hidden state
        embeddings = outputs.last_hidden_state.mean(dim=1).squeeze().tolist()
        
    return NLPResponse(
        vector=embeddings,
        extracted_budget=extracted_data["extracted_budget"],
        intent=extracted_data["intent"]
    )

@router.post("/extract-intent", response_model=ExtractIntentResponse)
async def extract_intent(request: ExtractIntentRequest):
    tokenizer, model = get_tokenizer_and_model()

    tags = extract_tags(request.text)
    budget = extract_budget(request.text)

    inputs = tokenizer(
        request.text,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=128,
    )

    with torch.no_grad():
        outputs = model(**inputs)
        last_hidden_state = outputs.last_hidden_state
        attention_mask = inputs["attention_mask"].unsqueeze(-1)

        masked_embeddings = last_hidden_state * attention_mask
        sum_embeddings = masked_embeddings.sum(dim=1)
        valid_tokens = attention_mask.sum(dim=1).clamp(min=1)
        query_vector = (sum_embeddings / valid_tokens).squeeze(0).tolist()

    return ExtractIntentResponse(
        raw_text=request.text,
        tags=tags,
        budget=budget,
        query_vector=query_vector,
        lat=request.lat,
        lng=request.lng,
    )
