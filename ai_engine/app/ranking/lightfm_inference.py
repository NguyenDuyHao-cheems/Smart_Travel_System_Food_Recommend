"""
lightfm_inference.py — LightFM collaborative filtering inference.

Load pre-trained LightFM artifacts (.pkl) và tính điểm tương đồng
giữa user và restaurant. Dùng sigmoid để normalize về [0, 100] (int).
"""

import pickle
import numpy as np
import os
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


class LightFMInference:
    def __init__(self):
        self.model_path = getattr(settings, "LIGHTFM_MODEL_PATH", None)

        # Fallback về đường dẫn mặc định nếu không có trong config
        if not self.model_path:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            self.model_path = os.path.join(
                current_dir, "lightfm", "models", "lightfm_artifacts.pkl"
            )

        logger.info("LightFM đang tìm file tại: %s", self.model_path)

        # Kiểm tra file có tồn tại không
        if not os.path.exists(self.model_path):
            logger.warning(
                "Không tìm thấy LightFM model tại %s. "
                "similarity_score sẽ = 0 cho tất cả ứng viên.",
                self.model_path
            )
            self.data = None
            return

        # Load artifacts
        try:
            with open(self.model_path, "rb") as f:
                self.data = pickle.load(f)
            logger.info("Đã nạp thành công LightFM artifacts.")
        except Exception as exc:
            logger.error("Lỗi khi đọc LightFM artifacts: %s", exc)
            self.data = None

    def get_similarity(self, user_id: str, res_id: str) -> int:
        """
        Tính điểm tương đồng giữa user và restaurant.
        Dùng sigmoid để normalize về [0, 100] (int).
        Trả về 0 nếu model không có hoặc user/item không tồn tại.
        """
        if not self.data:
            return 0
        try:
            u_map = self.data.get("user_map")
            i_map = self.data.get("item_map")
            model = self.data.get("model")

            # Ép kiểu về string để tra cứu mapping
            uid = u_map.get(str(user_id))
            iid = i_map.get(str(res_id))

            if uid is None or iid is None:
                return 0

            # Dot product → sigmoid → [0, 100]
            u_vec = model.user_embeddings[uid]
            i_vec = model.item_embeddings[iid]
            score = float(np.dot(u_vec, i_vec))
            prob = 1 / (1 + np.exp(-score))  # sigmoid
            return int(prob * 100)
        except Exception as exc:
            logger.debug("LightFM similarity error: %s", exc)
            return 0
