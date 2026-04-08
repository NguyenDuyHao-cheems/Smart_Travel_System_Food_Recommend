# 🗺️ Smart Travel System - Food Recommend

## 📁 Cấu Trúc Dự Án

- `core_backend/`: Chứa API chính yếu và xử lý logic nghiệp vụ của hệ thống (Framework: FastAPI).
- `ai_engine/`: Chứa service AI xử lý các tác vụ về gợi ý du lịch và ẩm thực (Framework: FastAPI).
- `Frontend/`: Chứa mã nguồn giao diện người dùng web (Framework: Next.js).
- `Data_Pipeline/`: Nơi chứa script/pipeline để nạp và xử lý dữ liệu.
- `docker-compose.yml`: File cấu hình dùng để chạy các service backend một cách nhanh chóng.

## 🛠 Yêu Cầu Hệ Thống (Prerequisites)

- **Git**
- **Docker** & **Docker Compose** (Dành cho việc chạy backend services)
- **Node.js** (Phiên bản LTS, >= 18.x) và **npm** (Hoặc yarn/pnpm, để chạy Frontend)
- **Python** (>= 3.10) (Nếu muốn chạy backend thủ công trên máy thật)

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

Bạn có 2 lựa chọn để phát triển: Chạy toàn bộ backend qua Docker và Frontend chạy ở máy local.

### Bước 1: Clone dự án

```bash
git clone <repository_url>
cd Smart_Travel_System_Food_Recommend
```

### Bước 2: Cấu hình biến môi trường (`.env`)

Trong thư mục `core_backend` và `ai_engine`, sao chép file `.env.example` thành file `.env` và thiết lập các API key hoặc Credentials cần thiết:

```bash
cp core_backend/.env.example core_backend/.env
# Chỉnh sửa nếu có thiết lập đặc biệt cho ai_engine
```

### Bước 3: Khởi chạy Backend Services bằng Docker Compose

```bash
docker-compose up -d --build
```

Lệnh này sẽ xây dựng và chạy 2 container:

- **Core Backend Service**: Hoạt động ở cổng `8000`. Truy cập Swagger UI tại [http://localhost:8000/docs](http://localhost:8000/docs).
- **AI Engine Service**: Hoạt động ở cổng `8001`. Truy cập Swagger UI tại [http://localhost:8001/docs](http://localhost:8001/docs).

### Bước 4: Khởi chạy Frontend

Frontend hiện được xây dựng bằng Next.js, bạn cần khởi chạy thư mục `Frontend` ở máy tính:

```bash
cd Frontend
npm install    # Hoặc yarn install
npm run dev    # Chạy ở chế độ phát triển
```

Ứng dụng web sẽ được phơi bày tại [http://localhost:3000](http://localhost:3000).

---

## 🧰 Phát Triển Dịch Vụ Cục Bộ (Không dùng Docker)

Nếu bạn chỉ muốn làm việc trên 1 service cụ thể (vd `core_backend`) và phân tích bug trực tiếp trên code base của mình:

```bash
cd core_backend
python -m venv venv

# Active venv (Tùy hệ điều hành Window hoặc Linux/Mac)
source venv/Scripts/activate  # Trên Windows (Git Bash/PowerShell)
# source venv/bin/activate    # Trên Linux/Mac

pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## 🤝 Đóng Góp (Contributing)

Để đóng góp vào dự án:

1. Đọc file [CONTRIBUTING.md](./CONTRIBUTING.md) để nắm quy định về chuẩn commit, code convention và quy trình tạo branch.
2. Tạo một nhánh mới cho task của bạn: `git checkout -b feature/tên-tính-năng`.
3. Commit code của bạn: `git commit -m "feat: Thêm tính năng XY"`.
4. Push lên repo: `git push origin feature/tên-tính-năng`.
5. Tạo Pull Request để các thành viên khác có thể review code.

Chúc bạn đóng góp vui vẻ! 🎉
