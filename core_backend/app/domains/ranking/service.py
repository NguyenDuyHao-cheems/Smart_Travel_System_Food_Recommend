import numpy as np
from typing import List, Dict, Any
from .schemas import Candidate, RankRequest
import json
from sqlalchemy.orm import Session
from .models import RestaurantModel, RestaurantTagModel, TagModel 
from app.core.database import SessionLocal

class RankingService:  #Lightfm
    
    def __init__(self):
        from cachetools import TTLCache
        # Cache 1000 entries, expire sau 5 phút
        self.cache = TTLCache(maxsize=1000, ttl=300)

    def get_key(self, pref_vector: List[float]) -> Any:
        # hash với độ chính xác 3 chữ số thập phân
        return tuple(round(x,3) for x in pref_vector)
    
    # build cache (tính 1 lần)
    def build_cache(self, key: Any, pref_vector: List[float], candidates: List[Candidate]) -> None:
        pref = np.array(pref_vector, dtype=np.float32)
        norm_pref = np.linalg.norm(pref)

        if norm_pref == 0 or not candidates:
            self.cache[key] = []
            return

        matrix = np.array([c.vector for c in candidates], dtype=np.float32)
        matrix_norms = np.linalg.norm(matrix, axis=1)

        # lọc vector 0
        valid_mask = matrix_norms > 1e-8
        if not np.any(valid_mask):
            self.cache[key] = []
            return

        matrix = matrix[valid_mask]
        matrix_norms = matrix_norms[valid_mask]
        valid_candidates = [c for c, v in zip(candidates, valid_mask) if v]

        # cosine similarity
        similarities = (matrix @ pref) / (matrix_norms * norm_pref)

        #lấy top 50 nhanh (argpartition)
        k = min(50, len(similarities))
        top_idx = np.argpartition(similarities, -k)[-k:]
        top_idx = top_idx[np.argsort(similarities[top_idx])[::-1]]

        # lưu cache
        self.cache[key] = [valid_candidates[i].res_id for i in top_idx]

    # trả về top k (theo offset)
    def rank(self, pref_vector: List[float], candidates: List[Candidate], k = 5, offset = 0) -> List[int]:
        # giả sử key là hash của pref_vector (hoặc có thể dùng một ID khác nếu có)
        key = self.get_key(pref_vector)
        if key not in self.cache:
            self.build_cache(key, pref_vector, candidates)
        return self.cache[key][offset:offset+k]
        
    def get_recommendations(self, db: Session, request: RankRequest) -> List[int]:
        # 1. Retrieval: Lọc thô từ Postgres (tags, budget, location, is_open)
        retrieval_service = RetrievalService(db)
        candidates = retrieval_service.get_candidates(
            tags=request.tags,
            budget=request.budget,
            user_location=request.user_location,
            radius=request.radius
        )

        # 2. Ranking: Xếp hạng bằng NumPy Cosine Similarity với Cache
        top_ids = self.rank(
            pref_vector=request.pref_vector,
            candidates=candidates,
            k=request.k,
            offset=request.offset
        )
        return top_ids
    
    # xóa cache khi cần (ví dụ khi có update về restaurant)
    def clear_cache(self, pref_vector: List[float]) -> None:
        key = self.get_key(pref_vector)
        self.cache.pop(key, None)

class RetrievalService:
    def __init__(self, db: Session):
        self.db = db

    def get_candidates(self, tags: List[str], budget: float, user_location: List[float], radius: float) -> List[Candidate]:
        """
        Thực hiện lọc thô (Retrieval) từ Database:
        1. is_open == True
        2. price_level <= budget
        3. Vị trí trong bán kính cho phép
        4. Có chứa các tags yêu cầu
        """
        # 1. Khởi tạo query lọc các điều kiện cơ bản
        query = self.db.query(RestaurantModel).filter(
            RestaurantModel.is_open == True,
            RestaurantModel.price_level <= budget
        )

        # 2. Lọc theo vị trí (Bounding Box để tối ưu tốc độ)
        # 1km xấp xỉ 0.01 độ lat/lng
        lat, lng = user_location
        deg_radius = radius / 111.0
        query = query.filter(
            RestaurantModel.lat.between(lat - deg_radius, lat + deg_radius),
            RestaurantModel.lng.between(lng - deg_radius, lng + deg_radius)
        )

        # 3. Lọc theo Tags (Many-to-Many join)
        if tags:
            query = query.join(RestaurantTagModel).join(TagModel).filter(
                TagModel.tag_name.in_(tags)
            )

        # 4. Thực thi truy vấn với .distinct() để tránh trùng lặp khi join tags
        # Giới hạn 500 để bước Ranking không bị quá tải
        results = query.distinct().limit(500).all()

        # 5. Chuyển đổi sang List[Candidate] cho RankingService
        candidates = []
        for r in results:
            # Dùng getattr để lấy giá trị thực tế, Pylance sẽ coi nó là 'Any' 
            # nên sẽ không bắt bẻ việc ép kiểu nữa
            raw_id = getattr(r, 'id', 0)
            raw_vec = getattr(r, 'vector', "")

            vec = self._parse_vector(raw_vec)
            if vec:
                candidates.append(Candidate(
                    res_id=int(raw_id), # Bây giờ ép kiểu thoải mái
                    vector=vec
                ))
        
        return candidates

    def _parse_vector(self, vector_data: Any) -> List[float]:
        """Chuyển đổi dữ liệu vector từ DB sang List[float]"""
        try:
            if not vector_data:
                return []
            if isinstance(vector_data, str):
                return json.loads(vector_data)
            if isinstance(vector_data, list):
                return [float(x) for x in vector_data]
            return []
        except Exception:
            return []
