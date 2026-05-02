import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    AI_SERVICE_PORT: int = int(os.getenv("AI_SERVICE_PORT", 8001))
    PHOBERT_MODEL_NAME: str = os.getenv("PHOBERT_MODEL_NAME", "vinai/phobert-base-v2")
    HF_TOKEN: str = os.getenv("HF_TOKEN", "")
    VECTOR_DIM: int = int(os.getenv("VECTOR_DIM", 768))

    # LambdaMART ranking engine
    LAMBDAMART_MODEL_PATH: str = os.getenv(
        "LAMBDAMART_MODEL_PATH", "models/lambdamart.lgb"
    )
    # Fix Issue #8: LAMBDAMART_MIN_TRAIN_SAMPLES removed (unused)

    # LightFM collaborative filtering model
    LIGHTFM_MODEL_PATH: str = os.getenv(
        "LIGHTFM_MODEL_PATH", "app/ranking/lightfm/models/lightfm_artifacts.pkl"
    )

    # Gemini API settings for NLP parsing
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL_NAME: str = os.getenv("GEMINI_MODEL_NAME", "gemini-flash-latest")

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
settings = Settings()
