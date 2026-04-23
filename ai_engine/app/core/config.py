import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    AI_SERVICE_PORT: int = int(os.getenv("AI_SERVICE_PORT", 8001))
    PHOBERT_MODEL_NAME: str = os.getenv("PHOBERT_MODEL_NAME", "vinai/phobert-base-v2")
    HF_TOKEN: str = os.getenv("HF_TOKEN", "")

    # LambdaMART ranking engine
    LAMBDAMART_MODEL_PATH: str = os.getenv(
        "LAMBDAMART_MODEL_PATH", "models/lambdamart.lgb"
    )
    LAMBDAMART_MIN_TRAIN_SAMPLES: int = int(
        os.getenv("LAMBDAMART_MIN_TRAIN_SAMPLES", "10")
    )

settings = Settings()
