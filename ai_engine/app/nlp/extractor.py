def extract_intent_and_budget(text: str):
    """
    Dummy implementation for extracting user intent and budget.
    In real production, this would use PhoBERT or rules via underthesea.
    """
    # Simple dummy logic for demonstration purposes
    budget = None
    if "rẻ" in text.lower() or "cheap" in text.lower():
        budget = 50000.0  # e.g. 50k VND
    elif "sang trọng" in text.lower() or "luxury" in text.lower():
        budget = 500000.0  # e.g. 500k VND
    
    intent = "search_food" 
    
    return {
        "intent": intent,
        "extracted_budget": budget
    }
