import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    AI_ENGINE_BASE_URL: str = os.getenv("AI_ENGINE_BASE_URL", "http://ai_engine:8001")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

settings = Settings()
