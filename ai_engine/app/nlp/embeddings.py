from fastapi import APIRouter, HTTPException
from .schemas import NLPRequest, NLPResponse
from .extractor import extract_intent_and_budget
from transformers import AutoTokenizer, AutoModel
import torch
from app.core.config import settings

router = APIRouter()

# Load PhoBERT model
tokenizer = AutoTokenizer.from_pretrained(settings.PHOBERT_MODEL_NAME)
model = AutoModel.from_pretrained(settings.PHOBERT_MODEL_NAME)

@router.post("/process", response_model=NLPResponse)
async def process_nlp(request: NLPRequest):
    """
    Takes user text, extracts intents and budget, and returns a 
    PhoBERT vector embedding.
    """
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
