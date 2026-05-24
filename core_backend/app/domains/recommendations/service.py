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
        
        # Bounding Box filtering (roughly 50km radius)
        # 1 degree of latitude is ~111km, so 50km is ~0.45 degrees
        lat_range = 0.45
        lng_range = 0.45
        
        base_query = db.query(RestaurantModel).filter(
            RestaurantModel.lat.between(lat - lat_range, lat + lat_range),
            RestaurantModel.lng.between(lng - lng_range, lng + lng_range)
        )
        
        if has_vector:
            # Query top 50 quán gần nhất bằng Cosine Similarity trong bán kính 50km
            # <-> operator is cosine distance, smaller is better
            raw_candidates = base_query.order_by(
                RestaurantModel.embedding_vector.cosine_distance(user.preferences_vector)
            ).limit(50).all()
        else:
            # Nếu không có vector, lấy top rating trong bán kính 50km
            raw_candidates = base_query.filter(
                RestaurantModel.rating_avg.isnot(None),
                RestaurantModel.total_reviews > 5
            ).order_by(
                desc(RestaurantModel.rating_avg),
                desc(RestaurantModel.total_reviews)
            ).limit(50).all()

        is_global_fallback = False
        if not raw_candidates:
            is_global_fallback = True
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
            
            if dist_km > 50 and not is_global_fallback:
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
                lat=float(model.lat) if model.lat is not None else None,
                lng=float(model.lng) if model.lng is not None else None,
                price=price_display,
                rating=rating_display,
                reason=reason_str,
                img=model.image_url or "/images/default_food.jpg",
                total_reviews=getattr(model, "total_reviews", 0) or 0,
                google_maps_url=getattr(model, "google_maps_url", None),
                allergen_warning=None,
                is_vegetarian=getattr(model, "is_vegetarian", False) or False
            )
            results.append({"res": res, "dist": dist_km, "rank": idx})
            
        if has_vector:
            # Ưu tiên vector đã query trước, kết hợp khoảng cách nhẹ
            results.sort(key=lambda x: x["rank"] + x["dist"] * 0.5)
        else:
            results.sort(key=lambda x: x["dist"])
            
        final_results = [r["res"] for r in results][:limit]
        return final_results

    @staticmethod
    async def get_personalized_recommendations(
        user: UserAccount,
        db: Session,
        limit: int = 10,
        lat: float = 10.880,
        lng: float = 10.808
    ) -> list[RecommendResult]:
        """
        Lấy gợi ý cá nhân hóa dựa trên LightFM Collaborative Filtering.
        Nếu gặp Cold Start hoặc lỗi Server AI Engine, hệ thống tự động chuyển sang Popularity Fallback.
        """
        from app.services.ai_client import get_ai_client
        ai_client = get_ai_client()
        
        # 1. Gọi AI Engine để lấy danh sách Restaurant IDs gợi ý
        recommended_ids = await ai_client.get_lightfm_recommendations(user.id, limit)
        
        raw_candidates = []
        is_fallback = False
        
        # 2. Xử lý Warm Start nếu có IDs trả về từ mô hình
        if recommended_ids:
            try:
                # Query thông tin chi tiết của các quán ăn tương ứng
                db_results = db.query(RestaurantModel).filter(
                    RestaurantModel.id.in_(recommended_ids)
                ).all()
                
                # Sắp xếp đúng theo thứ tự gợi ý ưu tiên từ AI Engine
                id_to_rank = {str(rid): idx for idx, rid in enumerate(recommended_ids)}
                db_results.sort(key=lambda r: id_to_rank.get(str(r.id), 999))
                raw_candidates = db_results
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Error querying recommended restaurants: {e}")
                is_fallback = True
        else:
            is_fallback = True
            
        # 3. Xử lý Cold Start / Fallback nếu danh sách rỗng (hoặc gặp lỗi)
        if is_fallback or not raw_candidates:
            # Bounding Box filtering (roughly 50km radius)
            lat_range = 0.45
            lng_range = 0.45
            
            raw_candidates = db.query(RestaurantModel).filter(
                RestaurantModel.lat.between(lat - lat_range, lat + lat_range),
                RestaurantModel.lng.between(lng - lng_range, lng + lng_range),
                RestaurantModel.rating_avg.isnot(None),
                RestaurantModel.total_reviews > 5
            ).order_by(
                desc(RestaurantModel.rating_avg),
                desc(RestaurantModel.total_reviews)
            ).limit(limit).all()
            
            if not raw_candidates:
                raw_candidates = db.query(RestaurantModel).filter(
                    RestaurantModel.rating_avg.isnot(None),
                    RestaurantModel.total_reviews > 5
                ).order_by(
                    desc(RestaurantModel.rating_avg),
                    desc(RestaurantModel.total_reviews)
                ).limit(limit).all()
            
        # 4. Định dạng dữ liệu thành RecommendResult cho UI Frontend
        results = []
        for idx, model in enumerate(raw_candidates):
            # Tính toán khoảng cách
            lat2, lng2 = float(model.lat or 0), float(model.lng or 0)
            R = 6371.0
            p1, p2 = math.radians(lat), math.radians(lat2)
            dp, dl = math.radians(lat2 - lat), math.radians(lng2 - lng)
            a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
            dist_km = R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            
            # Format mức giá hiển thị
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
                
            # Định dạng điểm đánh giá
            rating_display = str(model.rating_avg) if model.rating_avg else "Mới"
            if getattr(model, 'total_reviews', 0) in (0, None):
                rating_display = "Chưa có đánh giá"
                
            # Gắn nhãn Match hiển thị độ hấp dẫn
            match_str = "Gợi ý cho bạn" if not is_fallback else "Thịnh Hành"
            
            # Tính toán lý do gợi ý hiển thị
            reason = []
            if dist_km < 2.0:
                reason.append("Gần bạn")
            if model.rating_avg and model.rating_avg >= 4.5:
                reason.append("Đánh giá xuất sắc")
                
            reason_str = " · ".join(reason) if reason else ("Quán ngon phù hợp" if not is_fallback else "Quán ăn nổi bật")
            
            res = RecommendResult(
                id=str(model.id),
                name=model.name or "Không rõ tên",
                match=match_str,
                dist=f"{dist_km:.1f} km",
                distance_km=round(dist_km, 2),
                lat=float(model.lat) if model.lat is not None else None,
                lng=float(model.lng) if model.lng is not None else None,
                price=price_display,
                rating=rating_display,
                reason=reason_str,
                img=model.image_url or "/images/default_food.jpg",
                total_reviews=getattr(model, "total_reviews", 0) or 0,
                google_maps_url=getattr(model, "google_maps_url", None),
                allergen_warning=None,
                is_vegetarian=getattr(model, "is_vegetarian", False) or False
            )
            results.append(res)
            
        return results

    @staticmethod
    async def get_group_recommendations(
        user: UserAccount,
        friend_ids: list[str],
        lat: float,
        lng: float,
        limit: int,
        db: Session,
        budget: int | None = None,
        radius: float = 5.0
    ) -> dict:
        from app.domains.users.models import UserFriend, UserOnboarding
        from app.services.ai_client import embed_text
        from app.services.allergy_filter import (
            fetch_allergen_map,
            fetch_dish_detail_map,
            annotate_allergy,
        )

        # 1. Verify friend_ids are actual friends of user
        verified_friend_ids = []
        if friend_ids:
            friends = db.query(UserFriend.friend_id).filter(
                UserFriend.user_id == str(user.id),
                UserFriend.friend_id.in_(friend_ids)
            ).all()
            verified_friend_ids = [f[0] for f in friends]

        all_member_ids = [str(user.id)] + verified_friend_ids

        # 2. Gather profiles
        member_accounts = db.query(UserAccount).filter(UserAccount.id.in_(all_member_ids)).all()
        member_onboardings = db.query(UserOnboarding).filter(UserOnboarding.user_id.in_(all_member_ids)).all()

        accounts_map = {str(acc.id): acc for acc in member_accounts}
        onboardings_map = {str(onb.user_id): onb for onb in member_onboardings}

        # 3. Aggregate constraints
        group_is_vegetarian = False
        group_allergies = set()

        for member_id in all_member_ids:
            onb = onboardings_map.get(member_id)
            if onb:
                if getattr(onb, "is_vegetarian", False):
                    group_is_vegetarian = True
                if onb.allergies:
                    onb_allg = onb.allergies
                    if isinstance(onb_allg, str):
                        onb_allg = [a.strip() for a in onb_allg.split(",")]
                    for item in onb_allg:
                        if item:
                            group_allergies.add(item.strip().lower())

            acc = accounts_map.get(member_id)
            if acc and acc.allergies:
                acc_allg = acc.allergies
                if isinstance(acc_allg, str):
                    acc_allg = [a.strip() for a in acc_allg.split(",")]
                for item in acc_allg:
                    if item:
                        group_allergies.add(item.strip().lower())

        # 4. Resolve preference vectors
        vectors = []
        for member_id in all_member_ids:
            vec = None
            acc = accounts_map.get(member_id)
            if acc and acc.preferences_vector is not None:
                vec = list(acc.preferences_vector)
            
            if vec is None:
                onb = onboardings_map.get(member_id)
                if onb and onb.preferences_vector is not None:
                    vec = list(onb.preferences_vector)

            # Cold-start handling: generate temporary vector from favorite dishes
            if vec is None:
                onb = onboardings_map.get(member_id)
                if onb and onb.favorite_dishes:
                    fav_dishes = onb.favorite_dishes
                    if isinstance(fav_dishes, str):
                        fav_dishes = [d.strip() for d in fav_dishes.split(",") if d.strip()]
                    if isinstance(fav_dishes, list) and fav_dishes:
                        dishes_str = ", ".join(fav_dishes)
                        try:
                            temp_vec = await embed_text(dishes_str)
                            if temp_vec and len(temp_vec) == 768:
                                vec = temp_vec
                        except Exception as e:
                            import logging
                            logging.getLogger(__name__).warning(f"Error embedding cold start dishes for user {member_id}: {e}")

            if vec is not None:
                vectors.append(vec)

        # Compute average vector
        average_vector = None
        if vectors:
            dim = len(vectors[0])
            average_vector = []
            for i in range(dim):
                average_vector.append(sum(v[i] for v in vectors) / len(vectors))

        # 5. Perform query
        # Retrieve candidates in a dynamic loop over expanding bounding box ranges.
        # This prioritizes local restaurants first while ensuring a safe candidate pool size (>= 40)
        # to satisfy the "Minimum 16 results" requirement after applying allergy filters.
        budget_expr = None
        if budget and budget > 0:
            from sqlalchemy import cast, func, Integer, case, or_, and_
            raw_min_price_str = case(
                (RestaurantModel.price_range.contains("-"), func.split_part(RestaurantModel.price_range, "-", 1)),
                else_=RestaurantModel.price_range,
            )
            raw_max_price_str = case(
                (RestaurantModel.price_range.contains("-"), func.split_part(RestaurantModel.price_range, "-", 2)),
                else_=RestaurantModel.price_range,
            )
            
            clean_min_price_str = func.regexp_replace(raw_min_price_str, r'\D', '', 'g')
            clean_max_price_str = func.regexp_replace(raw_max_price_str, r'\D', '', 'g')
            
            clean_min_price_int = func.coalesce(cast(func.nullif(clean_min_price_str, ''), Integer), 0)
            clean_max_price_int = func.coalesce(cast(func.nullif(clean_max_price_str, ''), Integer), 0)

            budget_expr = or_(
                and_(clean_min_price_int == 0, clean_max_price_int == 0),
                clean_min_price_int <= budget,
                clean_max_price_int <= budget,
            )

        raw_candidates = []
        is_global_fallback = False
        results_contain_warnings = False
        steps = [0.15, 0.3, 0.6, 1.0]
        max_lat_range = radius / 111.0
        max_lng_range = radius / 109.0

        for factor in steps:
            lat_val = max_lat_range * factor
            lng_val = max_lng_range * factor
            base_query = db.query(RestaurantModel).filter(
                RestaurantModel.lat.between(lat - lat_val, lat + lat_val),
                RestaurantModel.lng.between(lng - lng_val, lng + lng_val),
                RestaurantModel.is_active == True
            )

            # Apply hard vegetarian filter
            if group_is_vegetarian:
                base_query = base_query.filter(RestaurantModel.is_vegetarian == True)

            # Apply budget filter
            if budget_expr is not None:
                base_query = base_query.filter(budget_expr)

            # Apply inline allergy filter
            if group_allergies:
                from app.services.allergy_filter import apply_inline_allergy_filter
                base_query = apply_inline_allergy_filter(db, base_query, list(group_allergies))

            if average_vector:
                temp_candidates = base_query.order_by(
                    RestaurantModel.embedding_vector.cosine_distance(average_vector)
                ).limit(150).all()
            else:
                temp_candidates = base_query.filter(
                    RestaurantModel.rating_avg.isnot(None),
                    RestaurantModel.total_reviews > 5
                ).order_by(
                    desc(RestaurantModel.rating_avg),
                    desc(RestaurantModel.total_reviews)
                ).limit(150).all()

            if len(temp_candidates) >= 40:
                raw_candidates = temp_candidates
                break
            else:
                raw_candidates = temp_candidates

        # Progressive Spatial Relaxation: expand radius up to 50km if results < 16
        if len(raw_candidates) < 16:
            for next_radius in [15.0, 30.0, 50.0]:
                if next_radius <= radius:
                    continue
                lat_val = next_radius / 111.0
                lng_val = next_radius / 109.0
                base_query = db.query(RestaurantModel).filter(
                    RestaurantModel.lat.between(lat - lat_val, lat + lat_val),
                    RestaurantModel.lng.between(lng - lng_val, lng + lng_val),
                    RestaurantModel.is_active == True
                )
                if group_is_vegetarian:
                    base_query = base_query.filter(RestaurantModel.is_vegetarian == True)
                if budget_expr is not None:
                    base_query = base_query.filter(budget_expr)
                if group_allergies:
                    from app.services.allergy_filter import apply_inline_allergy_filter
                    base_query = apply_inline_allergy_filter(db, base_query, list(group_allergies))

                if average_vector:
                    temp_candidates = base_query.order_by(
                        RestaurantModel.embedding_vector.cosine_distance(average_vector)
                    ).limit(150).all()
                else:
                    temp_candidates = base_query.filter(
                        RestaurantModel.rating_avg.isnot(None),
                        RestaurantModel.total_reviews > 5
                    ).order_by(
                        desc(RestaurantModel.rating_avg),
                        desc(RestaurantModel.total_reviews)
                    ).limit(150).all()

                if len(temp_candidates) >= 16:
                    raw_candidates = temp_candidates
                    radius = next_radius
                    break
                else:
                    raw_candidates = temp_candidates
                    radius = next_radius

        # Fallback globally if no restaurants within bounding box or still < 16 results
        if len(raw_candidates) < 16:
            fallback_query = db.query(RestaurantModel).filter(
                RestaurantModel.is_active == True
            )
            if group_is_vegetarian:
                fallback_query = fallback_query.filter(RestaurantModel.is_vegetarian == True)
            if budget_expr is not None:
                fallback_query = fallback_query.filter(budget_expr)

            # High warning fallback mode: query without allergy filtering
            unfiltered_candidates = fallback_query.filter(
                RestaurantModel.rating_avg.isnot(None),
                RestaurantModel.total_reviews > 5
            ).order_by(
                desc(RestaurantModel.rating_avg),
                desc(RestaurantModel.total_reviews)
            ).limit(150).all()

            if len(unfiltered_candidates) >= 16:
                raw_candidates = unfiltered_candidates
                is_global_fallback = True
                if group_allergies:
                    results_contain_warnings = True
            else:
                # If even unfiltered query has < 16 results, keep raw_candidates (safe candidates) to prioritize safety
                pass

        # 6. Apply allergy filtering / annotation
        safe_candidates = raw_candidates
        applied_allergies_list = list(group_allergies)
        if applied_allergies_list:
            restaurant_ids = [c.id for c in raw_candidates]
            allergen_map = fetch_allergen_map(db, restaurant_ids)
            dish_detail_map = fetch_dish_detail_map(db, restaurant_ids)
            safe_candidates, flagged_count = annotate_allergy(
                raw_candidates, applied_allergies_list, allergen_map, dish_detail_map
            )

        # 7. Formulate RecommendResult
        results = []
        for idx, model in enumerate(safe_candidates):
            lat2, lng2 = float(model.lat or 0), float(model.lng or 0)
            R = 6371.0
            p1, p2 = math.radians(lat), math.radians(lat2)
            dp, dl = math.radians(lat2 - lat), math.radians(lng2 - lng)
            a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
            dist_km = R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

            if dist_km > radius and not is_global_fallback:
                continue

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

            match_str = "95%" if average_vector else "Thịnh Hành"

            reason = []
            if dist_km < 2.0:
                reason.append("Rất gần nhóm")
            if model.rating_avg and model.rating_avg >= 4.5:
                reason.append("Đánh giá xuất sắc")
            reason_str = " · ".join(reason) if reason else ("Phù hợp với nhóm" if average_vector else "Quán ăn nổi bật")

            res = RecommendResult(
                id=str(model.id),
                name=model.name or "Không rõ tên",
                match=match_str,
                dist=f"{dist_km:.1f} km",
                distance_km=round(dist_km, 2),
                lat=float(model.lat) if model.lat is not None else None,
                lng=float(model.lng) if model.lng is not None else None,
                price=price_display,
                rating=rating_display,
                reason=reason_str,
                img=model.image_url or "/images/default_food.jpg",
                total_reviews=getattr(model, "total_reviews", 0) or 0,
                google_maps_url=getattr(model, "google_maps_url", None),
                allergen_warning=getattr(model, "allergen_warning", None),
                is_vegetarian=getattr(model, "is_vegetarian", False) or False
            )
            results.append(res)

        final_results = results[:limit]

        return {
            "results": final_results,
            "group_size": len(all_member_ids),
            "applied_vegetarian_filter": group_is_vegetarian,
            "applied_allergies": applied_allergies_list,
            "results_contain_warnings": results_contain_warnings
        }


