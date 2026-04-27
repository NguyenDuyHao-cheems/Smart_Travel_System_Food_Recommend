import pickle
import numpy as np
import os
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class LightFMInference:
    def __init__(self):
        # 1. Lấy đường dẫn từ file config (.env)
        # Giả sử trong settings của Bảo tên biến là LIGHTFM_MODEL_PATH
        self.model_path = getattr(settings, "LIGHTFM_MODEL_PATH", None)
        
        # Nếu không tìm thấy trong config, fallback về đường dẫn mặc định
        if not self.model_path:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            self.model_path = os.path.join(current_dir, "lightfm", "models", "lightfm_artifacts.pkl")

        logger.info(f"🚀 LightFM đang tìm file tại: {self.model_path}")

        # 2. Kiểm tra file có thực sự tồn tại không
        if not os.path.exists(self.model_path):
            logger.error(f"❌ KHÔNG TÌM THẤY FILE MODEL TẠI: {self.model_path}")
            logger.warning("Hệ thống sẽ chạy mà không có điểm LightFM (similarity_score = 0)")
            self.data = None
            return

        # 3. Load dữ liệu
        try:
            with open(self.model_path, 'rb') as f:
                self.data = pickle.load(f)
            logger.info("✅ Đã nạp thành công LightFM Artifacts từ Config.")
        except Exception as e:
            logger.error(f"❌ Lỗi khi đọc file artifacts: {e}")
            self.data = None

    def get_similarity(self, user_id: str, res_id: str) -> int:
        """Tính điểm tương đồng và trả về số nguyên 0-100"""
        if not self.data:
            return 0
        try:
            u_map = self.data.get('user_map')
            i_map = self.data.get('item_map')
            model = self.data.get('model')
            
            # Ép kiểu về string để tra cứu mapping
            uid = u_map.get(str(user_id))
            iid = i_map.get(str(res_id))
            
            if uid is None or iid is None:
                return 0
            
            # Dot product giữa vector người dùng và nhà hàng
            u_vec = model.user_embeddings[uid]
            i_vec = model.item_embeddings[iid]
            score = float(np.dot(u_vec, i_vec))
            
            # Chuẩn hóa về 0-100 (Integer)
            return int(max(0, min(1, score)) * 100)
        except Exception:
            return 0