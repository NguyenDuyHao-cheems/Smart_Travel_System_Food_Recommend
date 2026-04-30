"""Quick test script for sentiment search query parsing."""
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(__file__))

from app.nlp.llm_parser import parse_query_with_gemini
from app.nlp.query_parser import extract_tags, extract_budget
from app.core.config import settings

query = "Thua valorant buồn quá đi"

print("=" * 60)
print(f"Query: {query}")
print("=" * 60)

# Check if Gemini key is available
print(f"\nGEMINI_API_KEY configured: {'✅ Yes' if settings.GEMINI_API_KEY else '❌ No (will use regex fallback)'}")
print(f"GEMINI_MODEL_NAME: {settings.GEMINI_MODEL_NAME}")

# Test regex fallback directly
print("\n--- Regex Fallback Result ---")
tags_regex = extract_tags(query)
budget_regex = extract_budget(query)
print(f"  Tags:   {tags_regex}")
print(f"  Budget: {budget_regex}")

# Test full pipeline (Gemini -> fallback)
print("\n--- Full Pipeline Result (Gemini or Fallback) ---")
tags, budget, intent = parse_query_with_gemini(query)
print(f"  Tags:   {tags}")
print(f"  Budget: {budget}")
print(f"  Intent: {intent}")
print()
