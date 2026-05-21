# 🗺️ Smart Travel System - Food Recommend

## 📁 Cấu Trúc Dự Án

- `core_backend/`: Chứa API chính yếu và xử lý logic nghiệp vụ của hệ thống (Framework: FastAPI).
- `ai_engine/`: Chứa service AI xử lý các tác vụ về gợi ý du lịch và ẩm thực (Framework: FastAPI).
- `Frontend/`: Chứa mã nguồn giao diện người dùng web (Framework: Next.js).
- `Data_Pipeline/`: Nơi chứa script/pipeline để nạp và xử lý dữ liệu.
- `docker-compose.yml`: File cấu hình dùng để chạy các service backend một cách nhanh chóng.

## 🛠 Yêu Cầu Hệ Thống (Prerequisites)

- **Git**
- **Docker desktop**
- **Node.js** (Phiên bản LTS, >= 20.x) và **npm** (Hoặc yarn/pnpm, để chạy Frontend)
- **Python** (>= 3.10) (Nếu muốn chạy backend thủ công trên máy thật)

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy
Có thể chạy qua docker hoặc chạy cục bộ.

### Bước 1: Clone dự án

```bash
git clone <https://github.com/NguyenDuyHao-cheems/Smart_Travel_System_Food_Recommend.git>
cd Smart_Travel_System_Food_Recommend
```

### Bước 2: Cấu hình biến môi trường (`.env`)

Trong thư mục `core_backend` và `ai_engine`, sao chép file `.env.example` thành file `.env` và thiết lập các API key hoặc Credentials cần thiết:

```bash
cp core_backend/.env.example core_backend/.env
# Chỉnh sửa nếu có thiết lập đặc biệt cho ai_engine
```

#### Đối với file .env trong core_backend
- `DATABASE_URL`: đây là connection cho phép kết nối với cơ sở dữ liệu trên supabase. Để có được biến này, cần phải tạo một dự án trên supabase. Sau đó lấy connection string. Nó sẽ có dạng: `postgresql://user:password@host:5432/dbname` với phần password là password riêng của dự án đó trên supabase.
- `SECRET_KEY`: đây là key bí mật dùng để mã hóa và giải mã JWT token. Để có được biến này, cần phải tạo một chuỗi ngẫu nhiên gồm 32 ký tự. Có thể sử dụng các trang web tạo chuỗi ngẫu nhiên để tạo ra chuỗi này.
- `ENABLE_GRPC`: Bật/Tắt giao tiếp gRPC giữa Core Backend và AI Engine (`true`/`false`). Mặc định là `true`. Tự động fallback về HTTP REST nếu gRPC bị lỗi hoặc tắt.
- `AI_ENGINE_GRPC_TARGET`: Địa chỉ gRPC server của AI Engine. Mặc định là `localhost:50051`.
- Các biến còn lại có thể để mặc định.

#### Đối với file .env trong ai_engine 
- `AI_SERVICE_PORT`: có thể để 8001
- `AI_GRPC_PORT`: Port chạy gRPC server của AI Engine. Mặc định là `50051`.
- `EMBEDDING_MODEL_NAME`: là model dùng để nhúng vector, có thể sử dụng `bkai-foundation-models/vietnamese-bi-encoder`
- `HF_TOKEN`: được lấy từ trang access token của hugging face giúp tải model xuống nhanh hơn.
- `LAMBDAMART_MODEL_PATH`: `models/lambdamart.lgb`
- `GEMINI_API_KEY`: Được lấy từ trang AI Studio của google.
- `GEMINI_MODEL_NAME`: tên model sử dụng qua API google, vd như: `gemini-flash-latest`

#### Đối với frontend 
- Có thể lấy mặc định như file `env.example` trong thư mục Frontend.
### Bước 3: Khởi chạy toàn bộ hệ thống bằng Docker Compose

```bash
docker compose up --build -d
```
### Kiểm tra trạng thái

`docker compose ps`

```
 Kết quả mong đợi:
 NAME           STATUS          PORTS
 ai_engine      healthy         0.0.0.0:8001->8001/tcp, 0.0.0.0:50051->50051/tcp
 core_backend   healthy         0.0.0.0:8000->8000/tcp
```

### Các endpoint truy cập

- Frontend:     http://localhost:3000
- Core backend:     http://localhost:8000/docs
- AI Engine:    http://localhost:8001/docs


---

## 🧰 Phát Triển Dịch Vụ Cục Bộ (Không dùng Docker)
- Thực hiện cấu hình file env như ở **Bước 2**
### core_backend
```bash
cd core_backend
python -m venv venv

# Active venv (Tùy hệ điều hành Window hoặc Linux/Mac)
. venv/Scripts/activate  # Trên Windows (Git Bash/PowerShell)
# source venv/bin/activate    # Trên Linux/Mac

pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload
```
### ai_engine

```bash
cd ai_engine
python -m venv venv
. venv/Scripts/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8001 --reload
```

### Khởi chạy frontend cục bộ


```bash
cd Frontend
npm install    # Hoặc yarn install
# Lưu ý: Nếu gặp lỗi Peer Dependency, hãy dùng: npm install --legacy-peer-deps
npm run dev    # Chạy ở chế độ phát triển
```

---

## 📡 Giao Tiếp gRPC & Biên Dịch Protobuf

Hệ thống sử dụng kênh truyền **gRPC** hiệu năng cao (chạy song song trên cổng `50051` của AI Engine) để truyền dữ liệu vector và xếp hạng nhanh chóng, giảm thiểu trễ so với REST JSON thông thường.

### 1. Biên dịch lại file `.proto` (Khi có thay đổi schema)
Nếu bạn cập nhật định nghĩa API trong file `protobuf/ai_service.proto`, hãy chạy lệnh sau để tự động biên dịch lại code Python cho cả `core_backend` và `ai_engine`:
```bash
python protobuf/compile_proto.py
```
*(Script này cũng sẽ tự động xử lý lỗi relative import mặc định của Python gRPC compiler).*

### 2. Kiểm thử nhanh gRPC
Bạn có thể khởi động các service và chạy script kiểm thử độc lập dưới đây để xác thực kết nối gRPC (bao gồm cả kiểm tra tiếng Việt Unicode):
```bash
python ai_engine/tests/test_grpc_flow.py
```




