from sqlalchemy.orm import Session
from .models import RestaurantModel, DishModel, RestaurantTagModel, TagModel 
from .schemas import Candidate

class RetrievalService:
    def __init__(self, db: Session):
        self.db = db

    def get_candidates(self, tags, budget, user_location, radius):
        # Thiết lập tọa độ mặc định (HCMUS) nếu không có dữ liệu đầu vào
        lat = user_location[0] if user_location and len(user_location) > 0 else 10.762
        lng = user_location[1] if user_location and len(user_location) > 1 else 106.660
        
        # Chuyển đổi bán kính km sang độ (xấp xỉ)
        deg_radius = radius / 111.0

        # Query lấy thông tin Dish và Restaurant
        query = self.db.query(
            DishModel.id,
            DishModel.name.label("dish_name"),
            DishModel.price,
            DishModel.image_url,
            DishModel.embedding_vector.label("dish_vector"),
            RestaurantModel.name.label("res_name")
        ).join(RestaurantModel, DishModel.res_id == RestaurantModel.id)
        
        # BỘ LỌC CẬP NHẬT: Đã bỏ dishes.is_active
        # Chỉ lọc is_active cho Restaurant nếu bảng restaurants của bạn có cột này
        query = query.filter(RestaurantModel.is_active == True)
        
        # Lọc theo giá (budget)
        if budget > 0:
            query = query.filter(DishModel.price <= budget)
        
        # Lọc theo vị trí (bán kính)
        query = query.filter(
            RestaurantModel.lat.between(lat - deg_radius, lat + deg_radius),
            RestaurantModel.lng.between(lng - deg_radius, lng + deg_radius)
        )

        # Lọc theo tags
        if tags and len(tags) > 0 and tags[0] != "string":
            query = query.join(RestaurantTagModel, RestaurantModel.id == RestaurantTagModel.res_id) \
                         .join(TagModel).filter(TagModel.name.in_(tags))

        results = query.limit(50).all()
        candidates = []
        
        for r in results:
            vec = self._parse_vector(r.dish_vector)
            # Chỉ thêm vào danh sách nếu có vector để AI có thể tính toán
            if vec:
                candidates.append(Candidate(
                    res_id=str(r.id), 
                    vector=vec,
                    dish_name=r.dish_name,
                    restaurant_name=r.res_name,
                    price=float(r.price),
                    image_url=r.image_url,
                    metadata={"tags": tags} 
                ))
                
        return candidates
    
    def _parse_vector(self, vector_str):
        """Hàm hỗ trợ ép kiểu string vector từ DB sang List[float]"""
        if not vector_str or vector_str == "None": 
            return []
        try:
            # Xử lý các định dạng [0.1, 0.2] hoặc {0.1, 0.2}
            clean_str = str(vector_str).strip("[]{} ")
            if not clean_str:
                return []
            return [float(x) for x in clean_str.split(',') if x.strip()]
        except Exception as e:
            print(f"Lỗi parse vector: {e}")
            return []