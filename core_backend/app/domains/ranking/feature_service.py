import numpy as np
from typing import List

class FeatureService:
    def build_integer_features(self, candidates, user_lat: float, user_lng: float, budget: int) -> List[dict]:
        result = []
        for r in candidates:
            # 1. Tính khoảng cách và đổi sang đơn vị Mét (Int)
            dist_m = self._haversine_meters(user_lat, user_lng, float(r.lat), float(r.lng))
            
            # 2. % ngân sách (0-100) - Sử dụng price_range theo ERD của Bảo
            # Vì price_range trong DB là String, ta ép kiểu float trước khi tính %
            try:
                raw_price = float(getattr(r, "price_range", 0) or 0)
            except (ValueError, TypeError):
                raw_price = 0
            
            price_norm = int((raw_price / budget) * 100) if budget > 0 else 100

            # 3. Ép kiểu Rating & Sentiment (nhân 100)
            # Theo ERD của Bảo là: rating_avg và total_reviews
            sentiment_int = int((getattr(r, "sentiment_score", 0.0) or 0.0) * 100)
            rating_int = int((getattr(r, "rating_avg", 0.0) or 0.0) * 100)
            
            # 4. Trạng thái đóng mở cửa (Bonus signal cho AI)
            is_open_int = 1 if getattr(r, "is_open_now", False) else 0

            # Tạo dictionary khớp 100% với CandidateWithFeatures schema
            result.append({
                "res_id": str(r.id),
                "rating": rating_int,
                "sentiment_score": sentiment_int,
                "distance_m": int(dist_m), 
                "price_normalized": price_norm,
                "review_count": int(getattr(r, "total_reviews", 0) or 0),
                "is_open": is_open_int, 
                "similarity_score": 0   
            })
        return result

    def _haversine_meters(self, lat1, lng1, lat2, lng2) -> int:
        R = 6371000 # Bán kính Trái Đất (mét)
        p1, p2 = np.radians(lat1), np.radians(lat2)
        dp, dl = np.radians(lat2-lat1), np.radians(lng2-lng1)
        a = np.sin(dp/2)**2 + np.cos(p1)*np.cos(p2)*np.sin(dl/2)**2
        return int(R * 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a)))