import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    AI_SERVICE_PORT = int(os.getenv("AI_SERVICE_PORT", 8001))
    PHOBERT_MODEL_NAME = os.getenv("PHOBERT_MODEL_NAME", "vinai/phobert-base-v2")
    HF_TOKEN = os.getenv("HF_TOKEN", "")
    LIGHTFM_MODEL_PATH = os.getenv("LIGHTFM_MODEL_PATH", "app/ranking/lightfm/models/lightfm_artifacts.pkl")
    DATABASE_URL = os.getenv("DATABASE_URL", "")
settings = Settings()
