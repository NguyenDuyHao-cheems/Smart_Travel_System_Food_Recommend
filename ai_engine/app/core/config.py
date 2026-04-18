import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    AI_SERVICE_PORT = int(os.getenv("AI_SERVICE_PORT", 8001))
    PHOBERT_MODEL_NAME = os.getenv("PHOBERT_MODEL_NAME", "vinai/phobert-base-v2")
    HF_TOKEN = os.getenv("HF_TOKEN", "")

settings = Settings()
