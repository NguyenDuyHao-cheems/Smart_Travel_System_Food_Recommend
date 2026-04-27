import pickle
import os
import sys
import logging
from lightfm import LightFM
from core_backend.app.core.config import settings

# Tự động cấu hình PYTHONPATH để nhận diện module 'app'
CURRENT_FILE_PATH = os.path.abspath(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_FILE_PATH, "../../../../"))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

from app.ranking.lightfm.dataset_builder import LightFMDatasetBuilder
from app.core.config import settings

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

# Xác định thư mục models nội bộ của lightfm
MODEL_DIR = os.path.join(os.path.dirname(CURRENT_FILE_PATH), "models")
# File gộp tất cả model và mapping
ARTIFACT_PATH = os.path.join(MODEL_DIR, "lightfm_artifacts.pkl")

def train_lightfm_model():
    """Quy trình huấn luyện và xuất file Artifacts"""
    try:
        # 1. Chuẩn bị dữ liệu
        builder = LightFMDatasetBuilder(settings.DATABASE_URL)
        interactions, weights, item_features = builder.fetch_data_and_fit()

        if interactions is None:
            return

        # 2. Huấn luyện model (Sử dụng WARP loss cho Ranking)
        model = LightFM(
            loss='warp', 
            no_components=64, 
            learning_rate=0.05,
            random_state=42
        )
        
        logger.info("🚀 Đang huấn luyện LightFM...")
        model.fit(
            interactions, 
            sample_weight=weights, 
            item_features=item_features, 
            epochs=30, 
            num_threads=4
        )

        # 3. Tạo thư mục models nếu chưa có
        os.makedirs(MODEL_DIR, exist_ok=True)
        
        # 4. Đóng gói Model, Metadata và Mappings vào 1 Dictionary
        user_map, item_map = builder.get_mappings()
        artifacts = {
            "model": model,
            "item_features": item_features,
            "user_map": user_map,
            "item_map": item_map
        }

        # 5. Lưu vào file artifacts duy nhất
        with open(ARTIFACT_PATH, 'wb') as f:
            pickle.dump(artifacts, f)

        logger.info(f"THÀNH CÔNG: Đã lưu artifacts tại {ARTIFACT_PATH}")

    except Exception as e:
        logger.error(f"LỖI KHI TRAIN: {str(e)}")

if __name__ == "__main__":
    train_lightfm_model()