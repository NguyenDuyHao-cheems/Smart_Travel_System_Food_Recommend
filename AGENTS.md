<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:docs-index -->

# Documentation Index

> Trước khi code, hãy đọc file tài liệu tương ứng. Đây là **nguồn sự thật** cho từng chủ đề.

| File                      | Chủ đề                                    | Khi nào cần đọc                           |
| ------------------------- | ----------------------------------------- | ----------------------------------------- |
| docs/ARCHITECTURE.md      | Service Communication, Data Flow          | Giao tiếp service, luồng dữ liệu tổng thể |
| docs/API_CONTRACT.md      | Endpoint, request/response mẫu, mã lỗi    | Gọi API, viết client, thêm/sửa endpoint   |
| docs/DATABASE.md          | Schema, migration guide (Alembic)         | Thêm bảng, cột, vector field              |
| docs/TECH_STACK.md        | Thư viện chính các service                | Biết đúng package để tránh import sai     |
| docs/UI_System_Design.md  | Design system: color, typography, effects | Thiết kế / viết UI component mới          |
| docs/foder_description.md | Cấu trúc thư mục chi tiết                 | Tìm file trong codebase                   |

<!-- END:docs-index -->
