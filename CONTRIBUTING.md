>[!warning] Luôn kiểm tra trạng thái local và remote trước mỗi phiên làm việc và khi hoàn thành (push)
>Không push code thẳng lên nhánh main
>Làm việc ở các nhánh riêng
>Chỉ chỉnh sửa các file trong thư mục của mình

> [!tips] Commit small, clarity. Đừng ngâm code quá lâu


#### 1. Quy tắc Nhánh (Branching Rules)
- **main**: Nhánh code gốc, CHỈ CHỨA CODE CHẠY ĐƯỢC. Tuyệt đối không ai được push thẳng (direct push) lên `main`.
- **Cấu trúc đặt tên nhánh làm việc**: `loại-công-việc/tên-tính-năng`
  - Ví dụ: `feature/ai-itinerary` (Thêm tính năng mới)
  - Ví dụ: `bugfix/login-error` (Sửa lỗi)
  - Ví dụ: `ui/homepage-hero` (Làm giao diện)

#### 2. Quy tắc Commit (Commit Message)
Viết commit ngắn gọn, rõ ràng
- `feat: [Tên tính năng]` - Khi thêm tính năng mới. (VD: `feat: add FastAPI booking endpoint`)
- `fix: [Tên lỗi]` - Khi sửa lỗi. (VD: `fix: resolve CORS issue on login`)
- `docs: [Tên tài liệu]` - Khi cập nhật tài liệu.

#### 3. Quy trình làm việc (The Workflow)
- **Bước 1:** Cập nhật code từ nhánh dev
- **Bước 2:** `git checkout -b feature/ten-tinh-nang-cua-ban` (Tạo và chuyển sang nhánh mới).
- **Bước 3:** Dùng AI (Vibe coding) để viết code. Chạy thử trên local host.
  - Kiểm tra code quality, design system
  - Kiểm tra performance, bottle neck
  - Viết script test tự động, unit test
- **Bước 4:** Nếu code chạy ổn, thực hiện `git add .`, sau đó `git commit -m "feat: done my feature"`.
- **Bước 5:** `git push origin feature/ten-tinh-nang-cua-ban`.
- **Bước 6:** Lên GitHub tạo Pull Request (PR) gộp nhánh của bạn vào `dev`.
- **Bước 7:** Cập nhật trạng thái công việc trên trello và thông báo cho các thành viên khác vào review

#### 4. Quy tắc Review & Hợp nhất (Merge Rules)
- Phải có ít nhất 1 thành viên khác trong nhóm xem qua code (Review) và bấm "Approve" trên GitHub thì mới được Merge.
- Nếu bị Conflict (Xung đột), người tạo PR có trách nhiệm dùng AI hoặc ngồi cùng người review để giải quyết conflict trên máy của mình trước khi merge.
