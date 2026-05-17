from sqlalchemy.orm import Session
from sqlalchemy import desc
import math

from app.domains.users.models import UserAccount
from app.domains.ranking.models import RestaurantModel
from app.domains.search.schemas import RecommendResult

class RecommendationService:
    @staticmethod
    def get_home_recommendations(user: UserAccount | None, lat: float, lng: float, limit: int, db: Session) -> list[RecommendResult]:
        has_vector = user and user.preferences_vector is not None
        
        if has_vector:
            # Query top 50 quán gần nhất bằng Cosine Similarity
            # <-> operator is cosine distance, smaller is better
            raw_candidates = db.query(RestaurantModel).order_by(
                RestaurantModel.embedding_vector.cosine_distance(user.preferences_vector)
            ).limit(50).all()
        else:
            # Nếu không có vector, lấy top rating
            raw_candidates = db.query(RestaurantModel).filter(
                RestaurantModel.rating_avg.isnot(None),
                RestaurantModel.total_reviews > 5
            ).order_by(
                desc(RestaurantModel.rating_avg),
                desc(RestaurantModel.total_reviews)
            ).limit(50).all()

        results = []
        for idx, model in enumerate(raw_candidates):
            # Tính khoảng cách
            lat2, lng2 = float(model.lat or 0), float(model.lng or 0)
            R = 6371.0
            p1, p2 = math.radians(lat), math.radians(lat2)
            dp, dl = math.radians(lat2 - lat), math.radians(lng2 - lng)
            a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
            dist_km = R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            
            if dist_km > 50:
                continue

            # Format price
            price_str = model.price_range or ""
            if price_str:
                try:
                    parts = price_str.split("-")
                    formatted = [f"{int(p.strip()) // 1000}k" for p in parts if p.strip().isdigit()]
                    price_display = " - ".join(formatted) or price_str
                except Exception:
                    price_display = price_str
            else:
                price_display = "Liên hệ"

            rating_display = str(model.rating_avg) if model.rating_avg else "Mới"
            if getattr(model, 'total_reviews', 0) in (0, None):
                rating_display = "Chưa có đánh giá"

            match_str = "95%" if has_vector else "Thịnh Hành"
            
            # Reason
            reason = []
            if dist_km < 2.0:
                reason.append("Rất gần bạn")
            if model.rating_avg and model.rating_avg >= 4.5:
                if getattr(model, 'total_reviews', 0) > 0:
                    reason.append("Đánh giá cao")
                
            reason_str = " · ".join(reason) if reason else ("Gợi ý cho bạn" if has_vector else "Quán ăn nổi bật")

            res = RecommendResult(
                id=str(model.id),
                name=model.name or "Không rõ tên",
                match=match_str,
                dist=f"{dist_km:.1f} km",
                distance_km=round(dist_km, 2),
                price=price_display,
                rating=rating_display,
                reason=reason_str,
                img=model.image_url or "/images/default_food.jpg",
                total_reviews=getattr(model, "total_reviews", 0) or 0,
                google_maps_url=getattr(model, "google_maps_url", None),
                allergen_warning=None
            )
            results.append({"res": res, "dist": dist_km, "rank": idx})
            
        if has_vector:
            # Ưu tiên vector đã query trước, kết hợp khoảng cách nhẹ
            results.sort(key=lambda x: x["rank"] + x["dist"] * 0.5)
        else:
            results.sort(key=lambda x: x["dist"])
            
        final_results = [r["res"] for r in results][:limit]
        return final_results
