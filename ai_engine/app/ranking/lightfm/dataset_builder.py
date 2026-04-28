import pandas as pd
import numpy as np
from lightfm.data import Dataset
from sqlalchemy import create_engine
import logging

logger = logging.getLogger(__name__)

class LightFMDatasetBuilder:
    def __init__(self, db_url: str):
        """Khởi tạo kết nối DB và Dataset của LightFM"""
        self.engine = create_engine(db_url)
        self.dataset = Dataset()

    def fetch_data_and_fit(self):
        """Truy vấn dữ liệu và ánh xạ ID sang ma trận"""
        try:
            # 1. Lấy dữ liệu tương tác từ bảng interactions
            df_inter = pd.read_sql("SELECT user_id, res_id, rating FROM interactions", self.engine)
            
            # 2. Lấy Tags nhà hàng từ bảng res_tags (Xử lý Cold Start)
            df_items = pd.read_sql("""
                SELECT rt.res_id, t.name as tag_name 
                FROM res_tags rt 
                JOIN tags t ON rt.tag_id = t.id 
                WHERE t.name IS NOT NULL
            """, self.engine)

            if df_inter.empty:
                logger.warning("Không tìm thấy dữ liệu tương tác trong Database.")
                return None, None, None

            # Ép kiểu dữ liệu đồng nhất (UUID string và Float rating)
            df_inter['user_id'] = df_inter['user_id'].astype(str)
            df_inter['res_id'] = df_inter['res_id'].astype(str)
            df_inter['rating'] = df_inter['rating'].astype(float)
            df_items['res_id'] = df_items['res_id'].astype(str)

            # 3. Fit Dataset (Tạo mapping ID và Features)
            self.dataset.fit(
                users=df_inter['user_id'].unique(),
                items=df_inter['res_id'].unique(),
                item_features=df_items['tag_name'].unique()
            )

            # 4. Xây dựng ma trận tương tác (Interactions Matrix)
            (interactions, weights) = self.dataset.build_interactions(
                [(x['user_id'], x['res_id'], x['rating']) for _, x in df_inter.iterrows()]
            )

            # 5. Xây dựng ma trận đặc trưng nhà hàng (Item Features Matrix)
            item_tag_map = df_items.groupby('res_id')['tag_name'].apply(list).to_dict()
            item_features = self.dataset.build_item_features(
                [(res_id, tags) for res_id, tags in item_tag_map.items()]
            )
            
            logger.info(f"Đã chuẩn bị xong Dataset: {len(df_inter)} interactions.")
            return interactions, weights, item_features

        except Exception as e:
            logger.error(f"Lỗi Dataset Builder: {str(e)}")
            return None, None, None

    def get_mappings(self):
        """Lấy bộ từ điển ánh xạ ID thực sang Index nội bộ"""
        user_id_map, _, item_id_map, _ = self.dataset.mapping()
        return user_id_map, item_id_map