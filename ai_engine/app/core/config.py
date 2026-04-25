import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    AI_SERVICE_PORT = int(os.getenv("AI_SERVICE_PORT", 8001))
    PHOBERT_MODEL_NAME = os.getenv("PHOBERT_MODEL_NAME", "vinai/phobert-base-v2")
    HF_TOKEN = os.getenv("HF_TOKEN", "")
    LIGHTFM_MODEL_PATH = os.getenv("LIGHTFM_MODEL_PATH", "app/models/lightfm_model.pkl")
    USER_MAPPING_PATH = os.getenv("USER_MAPPING_PATH", "app/models/user_mapping.pkl")
    ITEM_MAPPING_PATH = os.getenv("ITEM_MAPPING_PATH", "app/models/item_mapping.pkl")
settings = Settings()
