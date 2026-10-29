# Decisions Log

Tài liệu này ghi lại các quyết định phạm vi và kiến trúc theo quy ước:
"When unsure about scope, choose the smaller option and note it in docs/decisions.md."

| Ngày | Quyết định | Phạm vi chọn | Lý do |
|---|---|---|---|
| 2026-10-29 | Khởi tạo cấu trúc dự án | Next.js 15+ App Router, Tailwind CSS, TypeScript | Chuẩn stack hiện đại, hỗ trợ Server Actions / Route Handlers, SEO và tối ưu hiệu năng |
| 2026-10-29 | Thuật toán đồ thị | Pure TypeScript functions trong `src/lib/graph.ts` | Tách biệt hoàn toàn logic nghiệp vụ khỏi UI; dễ unit test và deterministic |
| 2026-10-29 | Lưu trữ MVP | In-memory + seed file JSON + SQLite local | Hỗ trợ demo 100% offline không cần cài đặt database server phức tạp |
| 2026-10-29 | Thư viện biểu diễn đồ thị | `@xyflow/react` (React Flow v12) + `dagre` | Đủ mạnh mẽ để render DAG từ trái sang phải, tuỳ biến node card và cascade animation |
