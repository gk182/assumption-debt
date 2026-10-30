# Decisions Log

Tài liệu này ghi lại các quyết định phạm vi và kiến trúc theo quy ước:
"When unsure about scope, choose the smaller option and note it in docs/decisions.md."

| Ngày | Quyết định | Phạm vi chọn | Lý do |
|---|---|---|---|
| 2026-10-29 | Khởi tạo cấu trúc dự án | Next.js 15+ App Router, Tailwind CSS, TypeScript | Chuẩn stack hiện đại, hỗ trợ Server Actions / Route Handlers, SEO và tối ưu hiệu năng |
| 2026-10-29 | Thuật toán đồ thị | Pure TypeScript functions trong `src/lib/graph.ts` | Tách biệt hoàn toàn logic nghiệp vụ khỏi UI; dễ unit test và deterministic |
| 2026-10-29 | Lưu trữ MVP | In-memory + seed file JSON + SQLite local | Hỗ trợ demo 100% offline không cần cài đặt database server phức tạp |
| 2026-10-29 | Thư viện biểu diễn đồ thị | `@xyflow/react` (React Flow v12) + `dagre` | Đủ mạnh mẽ để render DAG từ trái sang phải, tuỳ biến node card và cascade animation |
| 2026-10-29 | Phase 6b: Chia đoạn và khử trùng lặp | Pure functions `chunkDocumentByHeadings` & `deduplicateAssumptions` trong `src/lib/chunking.ts` | Hỗ trợ tài liệu dài không bị nghẽn context window, loại bỏ các giả định trùng quote hoặc độ tương đồng cao |
| 2026-10-29 | Phase 6b: Đánh giá Gold Set & Cổng quyết định | 3 tài liệu thật (Fintech, ADR Redis, AI Call Center) đạt Novelty 66.7%, Precision 100% | Quyết định GO chính thức để tiếp tục phát triển Phase 7 (chỉnh đồ thị tay) và Phase 8 (task kiểm chứng) |
| 2026-10-29 | Phase 7: Chỉnh sửa đồ thị bằng tay & Undo/Redo | Pure functions `addEdgeSafe`, `removeEdgeSafe`, `removeNodeSafe`, `wouldCreateCycle` và Undo/Redo stack trong Zustand | Cho phép người dùng can thiệp sửa sai sót của AI, kéo nối/xóa liên kết, thêm nút thủ công mà không phá vỡ cấu trúc DAG |
| 2026-10-30 | Phase 8: Task kiểm chứng (Task Generator) | Hàm thuần `src/lib/tasks.ts`, UI Tab "Tasks" trong DebtPanel, xuất Markdown/CSV RFC-4180 | Nguyên tắc "Human in the loop": Đề xuất task kiểm chứng theo riskScore và task xem lại khi refute; người dùng chủ động duyệt/sửa/bỏ trước khi xuất sang Jira/GitHub |
| 2026-10-30 | Phase 9: Lịch sử và bằng chứng (History & Evidence) | Hàm thuần `src/lib/history.ts`, timeline trong tab Inspector, cảnh báo quá hạn verifyBy | Lưu vết thay đổi phục vụ post-mortem, đính kèm bằng chứng thực nghiệm (URL/notes) mà vẫn giữ nguyên tương thích ngược với `seed.json` không có trường history |
| 2026-10-30 | Phase 10: Lưu trữ, xuất/nhập và báo cáo | `src/lib/storage.ts` với `schemaVersion: 1` & migration, `src/lib/report.ts` xuất GFM Markdown/In | Lưu bền bằng localStorage, cho phép lưu và chia sẻ đồ thị qua JSON; xuất báo cáo điều hành toàn diện kèm nhãn rủi ro ước tính |

| 2026-10-30 | Phase 11: Nhiều tài liệu và bộ lọc (Smart Filter & Dedup) | Hàm thuần `src/lib/dedup.ts`, Root Doc Nodes trong `dagreLayout.ts`, Smart Filter Bar | Hỗ trợ nạp nối tiếp nhiều tài liệu PRD/ADR vào cùng đồ thị, gộp giả định trùng lặp và lọc theo tài liệu/trạng thái |
| 2026-10-30 | Lộ trình Thương mại hóa B2B SaaS (Phase 14 - 18) | Lưu trữ Cloud PostgreSQL, Tích hợp Jira/Linear/Slack 2 chiều, Ingestion trực tiếp | Chuyển đổi từ Local/Offline MVP thành B2B SaaS Platform, giữ nguyên vẹn 100% logic Phase 0-11 để tương thích |
| 2026-10-30 | Kiểm toán Red Team & Tái cấu trúc Lộ trình SaaS | docs/red_team_audit.md, hiệu đính PLAN.md | Tiếp thu toàn diện kiểm toán Red Team: chuẩn hóa số liệu Pendo/Stripe/McKinsey; chuyển sang lộ trình 3 giai đoạn 18–21 tuần có Cổng quyết định định lượng; chọn mũi nhọn Headless GitHub Action (BYOK) thay vì Top-Down Enterprise; bổ sung giải pháp cho 6 vấn đề kỹ thuật trọng yếu (Stateful Graph Merge, Unicode NFC, Prompt Eval Harness trong CI). |
