# System Architecture

<!-- BEGIN:service-communication -->

## Service Communication

Hệ thống gồm 3 tầng dịch vụ giao tiếp theo mô hình **chuỗi đồng bộ HTTP bất đồng bộ (async HTTP chain)**:

```
Browser (Next.js :3000)
        │  HTTP REST
        ▼
Core Backend (:8000)        [FastAPI + SQLAlchemy + PostgreSQL/pgvector]
        │  HTTP REST (httpx async)
        ▼
AI Engine (:8001)            [FastAPI + PhoBERT + LambdaMART]
```

### Tầng 1 — Frontend → Core Backend (Port 8000)

- **Origin**: `http://localhost:3000` (Next.js App Router)
- **Protocol**: HTTP/1.1 REST, JSON body
- **CORS**: Core Backend cho phép origin `http://localhost:3000` với mọi method và header.

> 📄 **Danh sách endpoint đầy đủ, request/response mẫu**: xem [`docs/API_CONTRACT.md`](./API_CONTRACT.md#core-backend-api)

**Luồng call điển hình (search):**
```
POST /api/v1/search/process  { "query": "mì cay gần đây dưới 50k" }
        │
        ▼  router.py (FastAPI route)
        │
        ▼  SearchService.process_search_query(query)
        │
        ▼  AIServiceClient.extract_intent_and_vectorize(text)
                │  httpx.AsyncClient().post(...)
                ▼
        AI Engine → trả { vector: [...], intent: ..., budget: ... }
        │
        ▼  (FUTURE) repository.search_restaurants(vector) → pgvector
        │
        ▼  Response trả về Frontend
```

### Tầng 2 — Core Backend → AI Engine (Port 8001)

- **Client**: `AIServiceClient` (`core_backend/app/services/ai_client.py`)
- **Library**: `httpx.AsyncClient` — non-blocking, không block event loop FastAPI.
- **Error handling**: Nếu AI Engine không phản hồi (`HTTPError`), `AIServiceClient` trả `None` và Core Backend ném `HTTP 503 Service Unavailable`.
- **Config**: URL cấu hình qua env var `AI_ENGINE_BASE_URL` (đọc bởi `app.core.config.settings`).

> 📄 **Chi tiết payload nội bộ Core Backend ↔ AI Engine**: xem [`docs/API_CONTRACT.md`](./API_CONTRACT.md#ai-engine-api)

> **Ghi chú triển khai**: Trong Docker Compose, cả hai service chạy trong cùng Docker network. `AI_ENGINE_BASE_URL` được set thành `http://ai_engine:8001` (service name resolution).

<!-- END:service-communication -->

---

<!-- BEGIN:data-flow -->

## Data Flow

### Tổng quan luồng dữ liệu

```
[Google Maps / Nguồn ngoài]
         │ (Scrapers)
         ▼
[raw_data/ — CSV / JSON]
         │ (ETL: seed.py)
         ▼
[PostgreSQL + pgvector]
         │
         ├─── Core Backend (:8000) ──→ CRUD / GPS query (PostGIS)
         │
         └─── AI Engine (:8001)
                    │
                    ├─── PhoBERT (NLP embedding từ review/text)
                    └─── LambdaMART (Ranking kết quả gợi ý)
```

### Chi tiết từng giai đoạn

#### Giai đoạn 1 — Thu thập dữ liệu (Scrapers)

- **Nguồn**: Google Maps (Places API hoặc web scraping).
- **Output**: File CSV/JSON lưu ở `Data_Pipeline/raw_data/`.
- **Dữ liệu thu thập**: tên quán, địa chỉ, tọa độ GPS, rating, review text, ảnh, giá tiền.

#### Giai đoạn 2 — Xử lý AI / Sentiment (AI_processing)

- **Công cụ**: Hugging Face `transformers` + `underthesea` (tokenize tiếng Việt).
- **Công việc**:
  - Phân tích cảm xúc từng review → gán nhãn (`positive` / `negative` / `neutral`).
  - Trích xuất key-words (loại món ăn, không gian, giá, địa điểm).
  - Sinh **PhoBERT vector embedding** cho mỗi quán (đại diện thông tin tổng hợp).
- **Output**: Dữ liệu đã được làm giàu (enriched), sẵn sàng để seed vào DB.

#### Giai đoạn 3 — Lưu trữ vào PostgreSQL (seed.py)

- **Script**: `Data_Pipeline/seed.py`
- **ORM**: SQLAlchemy (Core Backend models).
- **Bảng chính**:

| Bảng | Dữ liệu | Kiểu vector |
|------|---------|-------------|
| `restaurants` | Thông tin quán, GPS, giá | — |
| `restaurant_embeddings` | Vector PhoBERT 768 dims | `pgvector VECTOR(768)` |
| `users` | Thông tin user, preference vector | `pgvector VECTOR(768)` |

- **PostgreSQL + pgvector** cho phép tìm kiếm vector similarity (`<=>` cosine distance) ngay trong DB.

#### Giai đoạn 4 — AI Engine xử lý query người dùng

```
User gõ: "mì cay không gian đẹp dưới 50k gần tôi"
         │
         ▼ [AI Engine :8001]
         │
         ├─ underthesea.tokenize()     → tách từ tiếng Việt
         ├─ extract_intent()           → { intent: "search_food", budget: 50000 }
         └─ PhoBERT(text) → mean pooling → vector [768 dims]
         │
         ▼ [Core Backend :8000]
         │
         ├─ pgvector: SELECT ... ORDER BY embedding <=> vector LIMIT 20
         ├─ PostGIS:  WHERE ST_Distance(location, user_gps) < radius
         └─ Filter:   WHERE price_avg <= budget
         │
         ▼ [LambdaMART Ranking — ai_engine/app/ranking/lambdamart.py]
         │   Input:  danh sách 20 quán + feature vector (distance, rating, price, similarity)
         │   Model:  LightGBM Booster (LambdaMART objective = "lambdarank")
         │   Output: danh sách đã rerank theo relevance score
         │
         ▼ Response: Top 5–10 quán được đề xuất → Frontend
```

#### Giai đoạn 5 — Hiển thị kết quả (Frontend)

- Next.js nhận `SearchRecommendResponse` (danh sách `RecommendResult`).
- Render trên `/result` page bằng `ResultCard` components.
- Mỗi card hiển thị: tên, match %, khoảng cách, giá, rating, lý do gợi ý AI.

### Sơ đồ trạng thái dữ liệu

```
Raw Text (user)
    → [AI Engine] PhoBERT Vector (768d)
        → [pgvector] Cosine Similarity Candidates
            → [PostGIS] GPS Filter
                → [LambdaMART] Ranked Results
                    → [Frontend] UI Cards
```

<!-- END:data-flow -->
