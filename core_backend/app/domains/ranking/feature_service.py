"""
feature_service.py — Stage 2: Xây dựng integer feature vector cho AI Engine.

Tất cả features đều là int để tránh floating-point precision issues
và đảm bảo tính nhất quán với schema CandidateWithFeatures.
"""

import re

import numpy as np
from typing import List

from app.services.review_sentiment import normalize_restaurant_sentiment


def _extract_max_price(price_range) -> float:
    if not price_range:
        return 0.0

    price_text = str(price_range)
    max_price_text = price_text.split("-")[-1] if "-" in price_text else price_text
    digits = re.sub(r"\D", "", max_price_text)
    return float(digits) if digits else 0.0


class FeatureService:
    def build_integer_features(
        self, candidates, user_lat: float, user_lng: float, budget: int, query_text: str = ""
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
            # Gắn ngược lại vào candidate để recommendation_service dùng cho distance decay
            setattr(r, "distance_m", dist_m)

            # 2. % ngân sách (0–100) — price_range là String trong DB
            raw_price = _extract_max_price(getattr(r, "price_range", "") or "")
            
            if budget <= 0:
                price_norm = 0
            else:
                price_norm = int((raw_price / budget) * 100)

            # 3. Rating & Sentiment
            rating_int = int((getattr(r, "rating_avg", 0.0) or 0.0) * 100)
            # New sentiment scale is -1..1. Legacy neutral=5.0 is normalized here too.
            sentiment_unit = normalize_restaurant_sentiment(getattr(r, "sentiment_score", None))
            sentiment_int = int(sentiment_unit * 100)

            # 4. Trạng thái mở cửa — dùng is_open_now (bản NEW)
            is_open_int = 1 if getattr(r, "is_open_now", False) else 0

            # Lấy similarity score từ vector search (pgvector cosine_distance) nếu có
            sim_score = 0
            if hasattr(r, "distance") and r.distance is not None:
                sim_score = max(0, min(100, int((1.0 - r.distance) * 100)))

            # Lexical Keyword Boost (Hybrid Search Lite)
            # Bù đắp cho giới hạn của Vietnamese Bi-Encoder (miss các cross-lingual keywords hoặc từ khóa ngắn)
            if query_text and hasattr(r, "name") and r.name:
                q_lower = query_text.lower()
                n_lower = r.name.lower()
                
                # 1. Xử lý synonym groups (tiếng Việt <-> tiếng Anh)
                synonyms = [
                    ["cà phê", "coffee", "cafe", "càphê"],
                    ["trà sữa", "milk tea", "milktea"],
                    ["chay", "vegetarian", "vegan", "veggie", "đồ chay", "quán chay"],
                    ["sushi", "sashimi"],
                ]
                
                boosted = False
                for syn_group in synonyms:
                    if any(kw in q_lower for kw in syn_group):
                        # Query THỰC SỰ có chứa keyword trong group này
                        if any(kw in n_lower for kw in syn_group):
                            sim_score = min(100, sim_score + 40) # Boost cực mạnh cho exact semantic match
                            boosted = True
                            break
                        # Nếu user tìm "cà phê" nhưng n_lower không có, thì không boost
                
                # 2. Xử lý overlapping keywords thông thường
                if not boosted:
                    words = [w for w in q_lower.split() if len(w) >= 3 and w not in ["tìm", "quán", "nhà", "hàng", "ăn", "uống", "những"]]
                    for w in words:
                        if w in n_lower:
                            sim_score = min(100, sim_score + 25)
                            break

            result.append({
                "res_id": str(r.id),
                "rating": rating_int,
                "sentiment_score": sentiment_int,
                "distance_m": int(dist_m),
                "price_normalized": price_norm,
                "review_count": int(getattr(r, "total_reviews", 0) or 0),
                "similarity_score": sim_score,
                "is_open": is_open_int,
                "tag_match": 1 if getattr(r, "tag_match", False) else 0,
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
