import uuid
import random
import numpy as np
import pandas as pd
from faker import Faker

fake = Faker('vi_VN')

NUM_RESTAURANTS = 100
EMBEDDING_DIM = 768

TAGS_DATA = [
    {"name": "Trà Sữa"}, {"name": "Ăn Vặt"},
    {"name": "Cơm Văn Phòng"}, {"name": "Phở / Bún"},
    {"name": "Món Hàn"}, {"name": "Thịt Nướng"},
    {"name": "Lẩu"}, {"name": "Đồ Ăn Nhanh"},
    {"name": "Món Chay"}, {"name": "Cà phê"}
]

def generate_test_data():
    restaurants, restaurant_ids = [], []
    prefixes = ["Quán", "Tiệm ăn", "Nhà hàng", "Bếp", "Phở", "Bún bò"]

    # 1. Quán ăn
    for _ in range(NUM_RESTAURANTS):
        res_id = str(uuid.uuid4())
        restaurant_ids.append(res_id)
        lat = round(random.uniform(10.7500, 10.8200), 6)
        lng = round(random.uniform(106.6300, 106.7200), 6)
        vec = np.random.normal(0, 1, EMBEDDING_DIM)
        vec = vec / np.linalg.norm(vec)
        vec_str = "[" + ",".join(map(str, vec.tolist())) + "]"

        restaurants.append({
            "id": res_id, "name": f"{random.choice(prefixes)} {fake.name()}",
            "address": fake.address().replace("\n", ", "), "lat": lat, "lng": lng,
            "price_range": random.choice(["$", "$$", "$$$"]), "opening_hours": "08:00 - 22:00",
            "image_url": f"https://picsum.photos/seed/{random.randint(1,999)}/600/400",
            "rating_avg": round(random.uniform(3.5, 5.0), 1), "total_reviews": random.randint(50, 2000),
            "sentiment_score": round(random.uniform(0.5, 0.95), 2), "top_review_text": fake.sentence(),
            "is_active": True, "embedding_vector": vec_str
        })

    # 2. Tags — bỏ cột slug vì bảng DB không có
    tags, tag_ids = [], []
    for t in TAGS_DATA:
        t_id = str(uuid.uuid4())
        tag_ids.append(t_id)
        tags.append({"id": t_id, "name": t["name"]})

    # 3. res_tags — đúng tên cột: id, res_id, tag_id
    res_tags_mapping = []
    for res_id in restaurant_ids:
        for t_id in random.sample(tag_ids, random.randint(2, 3)):
            res_tags_mapping.append({
                "id": str(uuid.uuid4()),  # bảng res_tags yêu cầu cột id
                "res_id": res_id,         # đúng tên cột trong DB
                "tag_id": t_id
            })

    return restaurants, tags, res_tags_mapping

res_list, tag_list, mapping_list = generate_test_data()

# Thứ tự lưu file = thứ tự import vào Supabase: tags → restaurants → res_tags
pd.DataFrame(tag_list).to_csv("tags.csv", index=False, encoding='utf-8-sig')
pd.DataFrame(res_list).to_csv("restaurants.csv", index=False, encoding='utf-8-sig')
pd.DataFrame(mapping_list).to_csv("restaurant_tags.csv", index=False, encoding='utf-8-sig')

print("✅ Tạo xong!")
print(f"   tags.csv         : {len(tag_list)} dòng")
print(f"   restaurants.csv  : {len(res_list)} dòng")
print(f"   restaurant_tags  : {len(mapping_list)} dòng")
