## 1. Schema Description (Mô tả Lược đồ)

Cơ sở dữ liệu của **wander bite** được thiết kế để hỗ trợ tìm kiếm ngữ nghĩa (Semantic Search) và cá nhân hóa sâu. Hệ thống sử dụng PostgreSQL với extension `pgvector`.

### A. Các bảng chính và thuộc tính

- **`users` (Người dùng):** Lưu trữ thông tin định danh và hồ sơ sở thích.
  - `preferences_vector`: Vector đặc trưng cho sở thích dài hạn của người dùng.
  - `allergy_tags`: Dữ liệu JSONB lưu các thành phần gây dị ứng để lọc kết quả.
- **`restaurants` (Nhà hàng):** Thông tin thực thể địa điểm.
  - `lat`/`lng`: Tọa độ địa lý để tính khoảng cách.
  - `sentiment_score`: Điểm số cảm xúc tổng hợp từ các bài đánh giá (xử lý offline).
- **`dishes` (Món ăn):** Thành phần quan trọng nhất cho Stage 1 (Retrieval).
  - `embedding_vector` (vector(768)): Vector không gian được tạo bởi PhoBERT từ tên và mô tả món ăn.
  - `res_id`: Khóa ngoại liên kết với bảng `restaurants`.
- **`reviews` (Đánh giá):** Dữ liệu phản hồi phục vụ cho việc tính toán sentiment và cung cấp context cho LLM.

### B. Mối quan hệ (Relationships)

- **One-to-Many (`restaurants` -> `dishes`):** Một nhà hàng có thể có nhiều món ăn trong menu.
- **Many-to-Many (`users` <-> `restaurants` thông qua `reviews`):** Người dùng đánh giá nhiều nhà hàng và một nhà hàng nhận đánh giá từ nhiều người.
- **Relationship Link:** `dishes` là đơn vị nhỏ nhất để thực hiện tìm kiếm vector, sau đó kết quả được nhóm theo `res_id` để hiển thị thông tin quán ăn.

---

## 2. Migration Guide (Hướng dẫn quản lý Migration)

### Quy trình dành cho Agent/Developer:

#### Bước 1: Định nghĩa Model

Mọi thay đổi về cấu trúc bảng phải được thực hiện trong các file models (ví dụ: `app/domains/search/models.py`). Đảm bảo sử dụng đúng kiểu dữ liệu `pgvector` cho các cột vector.

#### Bước 2: Tạo bản ghi Migration (Autogenerate)

Agent không được tự tạo bảng bằng SQL. Phải dùng lệnh để Alembic tự động so sánh mã nguồn và DB hiện tại để sinh ra script:

```bash
# Chạy bên trong container core_backend
alembic revision --autogenerate -m "Mô tả thay đổi, vd: add_dishes_table"
```

#### Bước 3: Kiểm tra Script

File migration mới sẽ xuất hiện trong thư mục `alembic/versions/`. Kiểm tra kỹ hai hàm:

- `upgrade()`: Chứa các lệnh thay đổi DB (Add column, Create table).
- `downgrade()`: Chứa các lệnh để hoàn tác (Undo) nếu xảy ra lỗi.

#### Bước 4: Áp dụng thay đổi

Sau khi kiểm tra, thực hiện cập nhật Database:

```bash
alembic upgrade head
```

> **CẢNH BÁO CHO AGENT:** Tuyệt đối không xóa hoặc sửa đổi các file trong `alembic/versions/` đã được merge vào nhánh `dev`. Nếu muốn thay đổi, hãy tạo một `revision` mới.

---
