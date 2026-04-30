"""
feature_service.py — Stage 2: Xây dựng integer feature vector cho AI Engine.

Tất cả features đều là int để tránh floating-point precision issues
và đảm bảo tính nhất quán với schema CandidateWithFeatures.
"""

import numpy as np
from typing import List


class FeatureService:
    def build_integer_features(
        self, candidates, user_lat: float, user_lng: float, budget: int
    ) -> List[dict]:
        """
        Chuyển danh sách RestaurantModel rows thành list of dict với integer features.
        Khớp 100% với CandidateWithFeatures schema.
        """
        result = []
        for r in candidates:
            # 1. Tính khoảng cách (mét, int)
            dist_m = self._haversine_meters(
                user_lat, user_lng, float(r.lat or 0), float(r.lng or 0)
            )

            # 2. % ngân sách (0–100) — price_range là String trong DB
            try:
                raw_price_str = str(getattr(r, "price_range", "") or "")
                if "-" in raw_price_str:
                    raw_price = float(raw_price_str.split("-")[1].strip())
                elif raw_price_str:
                    raw_price = float(raw_price_str.strip())
                else:
                    raw_price = 0.0
            except (ValueError, TypeError, IndexError):
                raw_price = 0.0
            
            if budget <= 0:
                price_norm = 0
            else:
                price_norm = int((raw_price / budget) * 100)

            # 3. Rating & Sentiment nhân 100 — dùng field names bản NEW
            rating_int = int((getattr(r, "rating_avg", 0.0) or 0.0) * 100)
            sentiment_int = int((getattr(r, "sentiment_score", 0.0) or 0.0) * 100)

            # 4. Trạng thái mở cửa — dùng is_open_now (bản NEW)
            is_open_int = 1 if getattr(r, "is_open_now", False) else 0

            result.append({
                "res_id": str(r.id),
                "rating": rating_int,
                "sentiment_score": sentiment_int,
                "distance_m": int(dist_m),
                "price_normalized": price_norm,
                "review_count": int(getattr(r, "total_reviews", 0) or 0),
                "similarity_score": 0,          # AI Engine sẽ điền qua LightFM
                "is_open": is_open_int,
            })
        return result

    def _haversine_meters(self, lat1: float, lng1: float, lat2: float, lng2: float) -> int:
        """Tính khoảng cách Haversine tính bằng mét (int)."""
        R = 6_371_000  # bán kính Trái Đất (mét)
        p1, p2 = np.radians(lat1), np.radians(lat2)
        dp = np.radians(lat2 - lat1)
        dl = np.radians(lng2 - lng1)
        a = np.sin(dp / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dl / 2) ** 2
        return int(R * 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a)))
