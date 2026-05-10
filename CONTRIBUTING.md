>[!warning] Lưu ý: 
> Luôn check trạng thái của repository trên git graph trong khi làm việc
>Không push code thẳng lên nhánh main
>Làm việc ở các nhánh riêng
> Xóa nhánh sau khi pull request đã được merge thành công

> [!tips] Khi có sự thay đổi về các khóa bí mật cần thông báo cho team và cập nhật file .env.example cũng như cập nhật trên notion chung của nhóm

#### 1. Quy tắc Nhánh (Branching Rules)
- **main**: Nhánh code gốc, CHỈ CHỨA CODE CHẠY ĐƯỢC. Tuyệt đối không ai được push thẳng (direct push) lên `main`.
- **Cấu trúc đặt tên nhánh làm việc**: `loại-công-việc/tên-tính-năng`
  - Ví dụ: `feature/ai-itinerary` (Thêm tính năng mới)
  - Ví dụ: `bugfix/login-error` (Sửa lỗi)
  - Ví dụ: `ui/homepage-hero` (Làm giao diện)

#### 2. Quy tắc Commit (Commit Message)
Viết commit ngắn gọn, rõ ràng. Mỗi commit chỉ nên giải quyết 1 vấn đề và càng ít file changes càng tốt.
**Format chung**: `type(scope): message`
- `feat: [Tên tính năng]` - Khi thêm tính năng mới. (VD: `feat: add FastAPI booking endpoint`)
- `fix: [Tên lỗi]` - Khi sửa lỗi. (VD: `fix: resolve CORS issue on login`)
- `docs: [Tên tài liệu]` - Khi cập nhật tài liệu.
- ngoài ra còn `refactor`, `style`, `test`, `chore`, `perf`,...

#### 3. Quy trình làm việc (The Workflow)
- 1: check out sang nhánh dev (bỏ qua nếu hiện đang ở dev)
- 2: git pull
- 3: check out sang nhánh mới để code
- 4: viết code -> add -> commit -> push lên nhánh của mình
- 5: Viết test case cho tính năng của nhánh
- 6: Tạo pull request từ nhánh của mình sang nhánh dev
- 7: Theo dõi thông báo để Resolve comment nếu có. Khi resolve, commit tiếp tục trong nhánh mở PR
- 8: Sau khi nhánh đã được merge thành công thì xóa nhánh của mình 

#### 4. Quy tắc tạo pull request (PR)
- Phải đảm bảo chạy thử tính năng đó thành công trước khi tạo PR
- Phải viết các test case bao quát hết các tình huống cho tính năng của mình 
- Đối với các PR sửa đổi lớn, cần phải có phần mô tả rõ ràng về các thay đổi bao gồm đã sửa đổi những gì, ở những file nào, tại sao lại sửa như vậy, cách kiểm thử như nào và đã kiểm thử được những trường hợp nào

> [!WARNING] Trường hợp làm 2 tính năng cùng lúc
> Cần tạo 2 nhánh riêng cho mỗi tính năng. Sau khi hoàn thành một tính năng và tạo pr checkout sang nhánh dev để thực hiện quy trình ở **mục 3**. Không được tạo nhánh mới dựa trên nhánh vừa code tính năng. Điều này sẽ dẫn đến trùng lặp lịch sử commit khi tạo PR cho tính năng thứ 2. Vi phạm nguyên tắc mỗi PR 1 concern.

