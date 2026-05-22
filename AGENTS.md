<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:grpc-agent-rules -->

# gRPC & Protobuf: Quy tắc giao tiếp liên dịch vụ

1. **Cơ chế HTTP Fallback bắt buộc**: Mọi giao tiếp qua gRPC giữa Core Backend và AI Engine phải được bọc trong logic bắt lỗi và tự động fallback về REST API (HTTP) tương ứng để đảm bảo tính sẵn sàng cao (High Availability).
2. **Biên dịch Protobuf**: Khi thay đổi định nghĩa schema trong `protobuf/ai_service.proto`, bắt buộc phải chạy `python protobuf/compile_proto.py` để đồng bộ lại mã nguồn sinh ra cho cả 2 service.

<!-- END:grpc-agent-rules -->

<!-- BEGIN:unit-testing-rules -->

# Unit Testing: Bắt buộc viết unit test khi thêm tính năng mới

Khi thêm bất kỳ tính năng mới hoặc thay đổi logic nghiệp vụ quan trọng ở Backend (`core_backend` hoặc `ai_engine`), bắt buộc phải viết Unit Test tương ứng để kiểm thử hoạt động và phòng ngừa lỗi hồi quy (regression).

1. **Yêu cầu viết test**: Mọi module, service, helper hoặc API router mới được thêm vào đều phải đi kèm với unit test tương ứng trong thư mục `tests`.
2. **Môi trường chạy test**:
   - Đối với `core_backend`: Chạy `pytest` trong thư mục `core_backend/` để kiểm tra.
   - Đối với `ai_engine`: Chạy `pytest` trong thư mục `ai_engine/` để kiểm tra.
3. **Mục tiêu phủ test (Coverage)**: Đảm bảo độ bao phủ test đạt ít nhất 80% đối với phần code logic nghiệp vụ mới được bổ sung.
# Test on what implement
Chỉ chạy các test case của tính năng mới hoặc sửa đổi. Không chạy toàn bộ test suite trừ khi có yêu cầu.
<!-- END:unit-testing-rules -->

<!-- BEGIN:gemini-rules -->

# Claude: Quy tắc tối ưu lập trình và giảm thiểu lỗi

## 1. Think Before Coding (Suy nghĩ trước khi viết mã)
- Nêu rõ các giả định của bạn trước khi thực hiện. Nếu không chắc chắn, hãy hỏi lại người dùng.
- Trình bày rõ các phương án/hướng tiếp cận khác nhau thay vì tự ý chọn một cách tiếp cận trong âm thầm.
- Nếu có giải pháp đơn giản hơn, hãy đề xuất và thảo luận trước.

## 2. Simplicity First (Ưu tiên sự đơn giản)
- Viết mã nguồn tối giản nhất có thể để giải quyết vấn đề, không bổ sung các tính năng suy đoán hay tự vẽ thêm.
- Tránh tạo các lớp trừu tượng (abstraction) cho mã nguồn chỉ dùng một lần.
- Không viết các logic xử lý lỗi phức tạp cho những trường hợp bất khả thi hoặc giả định quá đà.

## 3. Surgical Changes (Chỉnh sửa chính xác như ngoại khoa)
- Chỉ chạm và sửa đổi những dòng mã cần thiết trực tiếp liên quan đến yêu cầu.
- Không tự ý "cải tiến", định dạng lại (formatting) hoặc viết lại các khối mã lân cận nếu chúng không bị lỗi và không liên quan.
- Tuân thủ phong cách viết mã (code style) hiện tại của codebase.
- Dọn dẹp sạch sẽ các import, biến hoặc hàm bị mồ côi (không còn sử dụng) do chính chỉnh sửa của bạn tạo ra.

## 4. Goal-Driven Execution (Thực thi theo mục tiêu và kiểm chứng)
- Chuyển đổi nhiệm vụ thành các mục tiêu có thể kiểm chứng rõ ràng (ví dụ: viết testcase mô phỏng lỗi trước, sửa code sau để testcase pass).
- Đối với nhiệm vụ nhiều bước, hãy chia nhỏ và xác định rõ tiêu chí thành công cho từng bước.

<!-- END:gemini-rules -->

<!-- BEGIN:env-rules -->

# Env & Config Rules: Quản lý biến môi trường và cấu hình

1. **Thông báo khi thay đổi env/config**: Nếu sửa đổi `ai_engine/app/core/config.py`, config của core_backend, hoặc thêm biến môi trường (env key) mới, agent/contributor PHẢI thông báo để chia sẻ key mới đó với team.
2. **Không commit key env**: Tuyệt đối không bao giờ commit key env hoặc thông tin nhạy cảm vào bất kỳ vị trí nào trên repository.
3. **Không xóa file ví dụ**: Tuyệt đối không xóa các file mẫu cấu hình môi trường (như `env.example` hoặc `.env.example`).

<!-- END:env-rules -->

<!-- BEGIN:docs-index -->

# Documentation Index

> Trước khi code, hãy đọc file tài liệu tương ứng. Đây là **nguồn sự thật** cho từng chủ đề.

| File                      | Chủ đề                                    | Khi nào cần đọc                           |
| ------------------------- | ----------------------------------------- | ----------------------------------------- |
| docs/ARCHITECTURE.md      | Service Communication, Data Flow          | Giao tiếp service, luồng dữ liệu tổng thể |
| docs/DATABASE.md          | Schema, migration guide (Alembic)         | Thêm bảng, cột, vector field              |
| docs/TECH_STACK.md        | Thư viện chính các service                | Biết đúng package để tránh import sai     |
| docs/foder_description.md | Cấu trúc thư mục chi tiết                 | Tìm file trong codebase                   |
| docs/spec_design.md       | Tài liệu thiết kế đặc tả chi tiết         | Hiểu chi tiết thiết kế logic nghiệp vụ    |

<!-- END:docs-index -->
