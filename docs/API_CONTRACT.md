# API Contract

> Đây là **nguồn sự thật duy nhất** cho tất cả request/response của hệ thống.
> Mọi thay đổi schema Pydantic phải được phản ánh tại đây.

---

<!-- BEGIN:core-backend-api -->

## Core Backend — Port 8000

Base URL (dev): `http://localhost:8000`

---

### `GET /api/health`

Kiểm tra trạng thái của Core Backend và kết nối Database.

**Request**: Không có body.

**Response `200 OK`**:
```json
{
  "status": "online",
  "backend": true,
  "database": true,
  "message": "Both backend and database systems reached"
}
```

**Response khi DB lỗi**:
```json
{
  "status": "online",
  "backend": true,
  "database": false,
  "message": "Backend ok, Database connection failed"
}
```

---

### `POST /api/v1/search/process`

Nhận query thô từ Frontend, forward sang AI Engine để trích xuất intent + sinh vector embedding.

> ⚠️ **Hiện trạng**: Sau khi nhận vector từ AI Engine, bước tìm kiếm trong PostgreSQL bằng `pgvector` đang ở trạng thái `# FUTURE IMPLEMENTATION`.

**Request Body**:
```json
{
  "query": "mì cay gần đây dưới 50k"
}
```

| Field | Type | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `query` | `string` | ✅ | Raw text query của người dùng |

**Response `200 OK`**:
```json
{
  "vector": [0.1234, -0.5678, 0.9101, "..."],
  "intent": "mì cay",
  "extracted_budget": 50000.0
}
```

| Field | Type | Mô tả |
|-------|------|-------|
| `vector` | `List[float]` | PhoBERT embedding 768 chiều |
| `intent` | `string \| null` | Loại món ăn được trích xuất |
| `extracted_budget` | `float \| null` | Ngân sách được trích xuất (VNĐ) |

**Response `503 Service Unavailable`** (khi AI Engine không phản hồi):
```json
{
  "detail": "AI engine is currently unavailable."
}
```

---

### `POST /api/v1/search/recommend`

Nhận query + tọa độ GPS của người dùng, trả về danh sách quán ăn được đề xuất (có xếp hạng AI).

> ⚠️ **Hiện trạng**: Kết quả hiện là **mock data**. Sẽ được thay bằng pgvector + PostGIS + LambdaMART khi hoàn thiện.

**Request Body**:
```json
{
  "query": "mì cay không gian đẹp dưới 50k",
  "lat": 10.8772,
  "lng": 106.8050
}
```

| Field | Type | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `query` | `string` | ✅ | Yêu cầu món ăn và ngữ cảnh |
| `lat` | `float` | ✅ | Vĩ độ hiện tại của người dùng |
| `lng` | `float` | ✅ | Kinh độ hiện tại của người dùng |

**Response `200 OK`**:
```json
{
  "results": [
    {
      "id": 1,
      "name": "Mì Cay Sasin - Làng Đại Học",
      "match": "98%",
      "dist": "1.1 km",
      "price": "49k - 89k",
      "rating": "4.9",
      "reason": "Khớp hoàn hảo: Nằm ngay trục đường sầm uất của Làng Đại Học.",
      "img": "/images/food1.jpg"
    }
  ]
}
```

| Field | Type | Mô tả |
|-------|------|-------|
| `results` | `List[RecommendResult]` | Danh sách quán đề xuất đã được xếp hạng |
| `results[].id` | `int` | ID quán |
| `results[].name` | `string` | Tên quán |
| `results[].match` | `string` | Phần trăm phù hợp (VD: `"98%"`) |
| `results[].dist` | `string` | Khoảng cách tới người dùng (VD: `"1.1 km"`) |
| `results[].price` | `string` | Khoảng giá trung bình (VD: `"49k - 89k"`) |
| `results[].rating` | `string` | Điểm đánh giá (VD: `"4.9"`) |
| `results[].reason` | `string` | Lý do AI đề xuất (hiển thị trên UI card) |
| `results[].img` | `string` | Đường dẫn ảnh quán |

---

### `POST /api/v1/users/{user_id}/onboarding`

Tiếp nhận thông tin sở thích của người dùng lần đầu sử dụng. Gọi AI Engine để sinh preference vector rồi lưu vào DB.

**Path Parameter**:

| Param | Type | Mô tả |
|-------|------|-------|
| `user_id` | `string` | ID người dùng |

**Request Body**:
```json
{
  "favorite_dishes": ["mì cay", "bún bò", "cơm tấm"],
  "spicy_level": "hot",
  "dietary_restrictions": ["vegetarian"],
  "allergies": ["peanuts"],
  "budget": "medium",
  "location": "Dĩ An, Bình Dương",
  "age": 21
}
```

| Field | Type | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `favorite_dishes` | `List[string]` | ✅ | 3–5 món ăn yêu thích |
| `spicy_level` | `"none" \| "mild" \| "medium" \| "hot" \| "extra_hot"` | ✅ | Mức độ cay ưa thích |
| `dietary_restrictions` | `List[string]` | ➖ | Các chế độ ăn (vegan, halal, ...) |
| `allergies` | `List[string]` | ➖ | Danh sách dị ứng thực phẩm |
| `budget` | `"low" \| "medium" \| "high"` | ✅ | Mức chi tiêu |
| `location` | `string` | ✅ | Thành phố / quận hiện tại |
| `age` | `int` (13–120) | ✅ | Tuổi người dùng |

**Response `200 OK`** (có dữ liệu lịch sử):
```json
{
  "status": "success",
  "message": "Onboarding completed",
  "preferences_vector": [0.12, -0.45, 0.78, "..."],
  "fallback": false,
  "popular_restaurants": null
}
```

**Response `200 OK`** (không có dữ liệu, fallback):
```json
{
  "status": "success",
  "message": "Onboarding completed",
  "preferences_vector": null,
  "fallback": true,
  "popular_restaurants": [
    {
      "name": "Phở Hùng",
      "cuisine": "Vietnamese",
      "rating": 4.8,
      "location": "Dĩ An, Bình Dương"
    }
  ]
}
```

**Response `422 Unprocessable Entity`** (vi phạm validation):
```json
{
  "detail": "favorite_dishes must contain between 3 and 5 items."
}
```

**Response `500 Internal Server Error`**:
```json
{
  "detail": "Onboarding failed: <error message>"
}
```

<!-- END:core-backend-api -->

---

<!-- BEGIN:ai-engine-api -->

## AI Engine (Internal) — Port 8001

Base URL (Docker internal): `http://ai_engine:8001`

> ⚠️ **Internal only**: Các endpoint này **không được gọi trực tiếp từ Frontend**. Chỉ Core Backend mới được gọi qua `AIServiceClient` (httpx).

---

### `GET /api/health`

Kiểm tra trạng thái AI Engine.

**Response `200 OK`**:
```json
{
  "status": "online",
  "ai_engine": true
}
```

---

### `POST /api/v1/nlp/process`

Nhận text thô, thực hiện:
1. Tokenize tiếng Việt bằng `underthesea`
2. Trích xuất intent + budget bằng `extract_intent_and_budget()`
3. Sinh PhoBERT vector embedding (mean pooling trên last hidden state)

**Caller**: `AIServiceClient.extract_intent_and_vectorize()` trong Core Backend.

**Request Body**:
```json
{
  "text": "mì cay gần đây dưới 50k"
}
```

| Field | Type | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `text` | `string` | ✅ | Raw text cần xử lý NLP |

**Response `200 OK`**:
```json
{
  "vector": [0.1234, -0.5678, 0.9101, "..."],
  "extracted_budget": 50000.0,
  "intent": "mì cay"
}
```

| Field | Type | Mô tả |
|-------|------|-------|
| `vector` | `List[float]` | PhoBERT embedding (768 chiều, mean pooling) |
| `extracted_budget` | `float \| null` | Ngân sách người dùng (đơn vị VNĐ) |
| `intent` | `string \| null` | Loại món ăn / ý định chính |

<!-- END:ai-engine-api -->

---

<!-- BEGIN:error-codes -->

## Mã lỗi chuẩn

| HTTP Code | Ý nghĩa | Nguyên nhân phổ biến |
|-----------|---------|---------------------|
| `200` | OK | Thành công |
| `422` | Unprocessable Entity | Vi phạm validation Pydantic (VD: thiếu field, sai type) |
| `500` | Internal Server Error | Lỗi logic server, DB lỗi, exception không được bắt |
| `503` | Service Unavailable | AI Engine không phản hồi (httpx timeout / connection error) |

<!-- END:error-codes -->
