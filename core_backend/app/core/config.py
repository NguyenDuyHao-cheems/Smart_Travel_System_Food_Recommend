import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    AI_ENGINE_BASE_URL: str = os.getenv("AI_ENGINE_BASE_URL", "http://localhost:8001")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    SECRET_KEY: str = os.environ["SECRET_KEY"]
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    VECTOR_DIM: int = int(os.getenv("VECTOR_DIM", "768"))

settings = Settings()
