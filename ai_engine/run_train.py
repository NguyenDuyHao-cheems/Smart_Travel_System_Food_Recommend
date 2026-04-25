import sys
import os

# 1. Thêm thư mục hiện tại vào PYTHONPATH để nhận diện được folder 'app'
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.ranking.engine.lightfm.train import LightFMTrainer
# Giả sử Bảo có một hàm helper để lấy dữ liệu từ Postgres
# Nếu chưa có, mình sẽ viết mockup dữ liệu để Bảo test trước
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

# --- CẤU HÌNH ---
DATABASE_URL = "postgresql://user:password@localhost:5432/your_db" # Thay bằng URL của Bảo
MODEL_PATH = "app/models/lightfm_model.pkl"
MAP_PATH = "app/models/user_mapping.pkl"

def get_interactions_from_db():
    """
    Lấy dữ liệu thực tế từ bảng user_interactions để train
    """
    try:
        engine = create_engine(DATABASE_URL)
        Session = sessionmaker(bind=engine)
        session = Session()

        # Giả sử bảng của Bảo tên là user_interactions
        # Quy đổi action_type sang điểm số (Weight)
        sql = text("""
            SELECT user_id, dish_id, 
            CASE 
                WHEN action_type = 'order' THEN 5.0
                WHEN action_type = 'click' THEN 1.0
                ELSE 0.5 
            END as weight
            FROM user_interactions
        """)
        
        result = session.execute(sql)
        data = [(str(row[0]), str(row[1]), float(row[2])) for row in result]
        session.close()
        return data
    except Exception as e:
        print(f"--- [ERROR] Không thể lấy data từ DB: {e} ---")
        return []

def main():
    print("🚀 Đang khởi động Script huấn luyện LightFM...")
    
    # 1. Lấy dữ liệu
    interactions = get_interactions_from_db()
    
    if not interactions:
        print("❌ Không có dữ liệu để huấn luyện. Vui lòng kiểm tra lại Database!")
        return

    # 2. Khởi tạo Trainer
    trainer = LightFMTrainer(
        model_save_path=MODEL_PATH,
        map_save_path=MAP_PATH
    )

    # 3. Chạy Training
    trainer.run_training(interactions)
    
    print("✅ Đã cập nhật Model và Mapping thành công!")

if __name__ == "__main__":
    main()