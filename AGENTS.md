<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:grpc-agent-rules -->

# gRPC & Protobuf: Quy tắc giao tiếp liên dịch vụ

1. **Cơ chế HTTP Fallback bắt buộc**: Mọi giao tiếp qua gRPC giữa Core Backend và AI Engine phải được bọc trong logic bắt lỗi và tự động fallback về REST API (HTTP) tương ứng để đảm bảo tính sẵn sàng cao (High Availability).
2. **Biên dịch Protobuf**: Khi thay đổi định nghĩa schema trong `protobuf/ai_service.proto`, bắt buộc phải chạy `python protobuf/compile_proto.py` để đồng bộ lại mã nguồn sinh ra cho cả 2 service.

<!-- END:grpc-agent-rules -->

<!-- BEGIN:docs-index -->

# Documentation Index

> Trước khi code, hãy đọc file tài liệu tương ứng. Đây là **nguồn sự thật** cho từng chủ đề.

| File                      | Chủ đề                                    | Khi nào cần đọc                           |
| ------------------------- | ----------------------------------------- | ----------------------------------------- |
| docs/ARCHITECTURE.md      | Service Communication, Data Flow          | Giao tiếp service, luồng dữ liệu tổng thể |
| docs/BE_API_DOCS.md       | API Contract & Endpoint của Core Backend  | Khi gọi API, viết client, thêm/sửa router |
| docs/AI-ENGINE_API_DOCS.md| API Contract & Endpoint của AI Engine     | Khi cần gọi API NLP, Rerank, Embeddings   |
| docs/DATABASE.md          | Schema, migration guide (Alembic)         | Thêm bảng, cột, vector field              |
| docs/TECH_STACK.md        | Thư viện chính các service                | Biết đúng package để tránh import sai     |
| docs/foder_description.md | Cấu trúc thư mục chi tiết                 | Tìm file trong codebase                   |
| docs/spec_design.md       | Tài liệu thiết kế đặc tả chi tiết         | Hiểu chi tiết thiết kế logic nghiệp vụ    |

<!-- END:docs-index -->
