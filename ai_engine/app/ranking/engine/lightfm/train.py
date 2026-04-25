import pickle
import os
from lightfm import LightFM
from .dataset_builder import LightFMDatasetBuilder

class LightFMTrainer:
    def __init__(self, model_path, user_map_path, item_map_path):
        self.paths = {
            "model": model_path,
            "user": user_map_path,
            "item": item_map_path
        }

    def run_training(self, raw_data):
        """
        raw_data: Dữ liệu tương tác lấy từ DB (User, Dish, Rating/Weight)
        """
        if not raw_data:
            print("⚠️ Không có dữ liệu để huấn luyện!")
            return

        # 1. Build dataset và lấy mapping
        builder = LightFMDatasetBuilder()
        interactions, weights, user_map, item_map = builder.build(raw_data)

        # 2. Khởi tạo mô hình LightFM
        # loss='warp' là tốt nhất cho bài toán Ranking món ăn
        model = LightFM(
            no_components=30, 
            loss='warp', 
            learning_schedule='adagrad',
            random_state=42
        )

        # 3. Huấn luyện
        print("🚀 Đang huấn luyện mô hình LightFM...")
        model.fit(
            interactions, 
            sample_weight=weights, 
            epochs=30, 
            num_threads=2
        )

        # 4. Tạo thư mục lưu trữ nếu chưa có
        os.makedirs(os.path.dirname(self.paths["model"]), exist_ok=True)

        # 5. Lưu đồng thời 3 file để đảm bảo tính nhất quán
        with open(self.paths["model"], 'wb') as f:
            pickle.dump(model, f)
        
        with open(self.paths["user"], 'wb') as f:
            pickle.dump(user_map, f)
            
        with open(self.paths["item"], 'wb') as f:
            pickle.dump(item_map, f)
        
        print(f"✅ Hoàn thành! Đã lưu model và mapping cho {len(user_map)} users, {len(item_map)} items.")