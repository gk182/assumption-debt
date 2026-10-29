# Kế hoạch: Assumption Debt (MVP 7 ngày + kiểm chứng song song)

Mục tiêu: demo 2 phút chạy được, và có số liệu thật cho câu hỏi "công cụ có chỉ ra điều người ta chưa nghĩ tới không?".

## Tổng quan

| Phase | Thời gian | Kết quả | Skill dùng |
|---|---|---|---|
| 0. Khởi tạo | 0.5 ngày | Next.js chạy, lint, test, env | `architecture` |
| 1. Lõi đồ thị | 1 ngày | `graph.ts` + test xanh | `impact-propagation`, `testing-strategy` |
| 2. Trích xuất LLM | 1 ngày | API `/extract` trả JSON hợp lệ | `assumption-extractor` |
| 3. UI Review + Graph | 2 ngày | 3 màn hình chạy với seed | `graph-ui`, `frontend-design` |
| 4. Refute + cascade | 1 ngày | Hiệu ứng dây chuyền + panel nợ | `graph-ui`, `impact-propagation` |
| 5. Demo | 0.5 ngày | Reset/seed, offline, kịch bản | `demo-builder` |
| 6. Kiểm chứng | song song từ ngày 2 | Bảng chỉ số trong `docs/eval-log.md` | `extraction-eval` |

## Phase 0: Khởi tạo (0.5 ngày)
- [x] Next.js (TS, Tailwind, App Router) vào thư mục này, giữ nguyên `.agents/`, `.claude/`, `data/`, `docs/`
- [x] Cài: `@xyflow/react dagre zustand zod @anthropic-ai/sdk lucide-react` và dev: `vitest vite @types/dagre`
- [x] `.env.example` và `.env.local` với `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `DEMO_MODE`
- [x] Scripts: `test`, `seed`, `reset`
- Done when: `npm run dev`, `npm run build` và `npm test` chạy thành công.

## Phase 1: Lõi đồ thị (1 ngày)
- [x] `src/lib/types.ts`, `src/lib/graph.ts`: `downstream`, `effortAtRisk`, `riskScore`, `debtTotal`, `getNeedsReviewNodes`, `computeGraphMetrics`
- [x] Port từ `.agents/skills/impact-propagation/scripts/propagate.py`
- [x] Test: cascade đơn giản, kim cương, chu trình, nút đã validated, refute nút lá, thứ hạng rủi ro (10/10 test passed)
- Done when: refute `A1` trên seed => `D1, D2, T1`, 6.0 tuần (Đã test pass).

## Phase 2: Trích xuất LLM (1 ngày)
- [x] `src/lib/schema.ts` (zod) theo `references/output-schema.md`
- [x] `src/app/api/extract/route.ts` dùng tool use, retry 1 lần khi sai schema
- [x] Bộ lọc chống bịa: bỏ item có quote không nằm trong văn bản (`filterHallucinations`)
- [x] Cache kết quả cho demo: `data/demo/extraction-cached.json`
- Done when: tài liệu mẫu cho JSON hợp lệ, quote 100% hợp lệ (Đã test pass trong `schema.test.ts`).

## Phase 3: UI (2 ngày)
- [x] Màn Paste & Extract (`src/app/page.tsx` kèm nút nạp mẫu 1-click)
- [x] Review inbox (`src/app/review/page.tsx`: Confirm / Edit / Reject, phím tắt Enter/Backspace/E, bulk confirm)
- [x] Graph React Flow (`src/app/graph/page.tsx`, layout dagre trái sang phải, 3 loại custom nodes)
- [x] Panel bên phải: chi tiết nút, nút đổi trạng thái, xếp hạng rủi ro (`DebtPanel.tsx`)
- Done when: luồng dán tài liệu đến review và graph chạy liền mạch trên desktop & mobile.

## Phase 4: Refute + cascade (1 ngày)
- [x] Nút "Bác bỏ" có ô ghi lý do / bằng chứng
- [x] Hiệu ứng sụp đổ dây chuyền (Cascade Banner) với depth & số tuần công việc bị ảnh hưởng
- [x] Đánh dấu đỏ pulsating trên toàn bộ các node `needs_review`
- [x] Re-validate hoặc đổi trạng thái tự động giải phóng cờ `needs_review`
- Done when: khoảnh khắc demo ở bước 5 trong `demo-builder` chạy mượt (có nút "Demo: Bác bỏ A1" 1-click).

## Phase 5: Demo (0.5 ngày)
- [x] `npm run seed` / `npm run reset`, chế độ offline `DEMO_MODE=1`
- [x] Kịch bản demo 2 phút được tối ưu và nạp sẵn cache offline

## Phase 6: Kiểm chứng (song song, bắt đầu từ ngày 2)
- [x] Tạo tài liệu nhật ký đánh giá trích xuất `docs/eval-log.md`
- [x] Thiết lập tiêu chuẩn Gold set và ngưỡng kiểm thử (Go / No-go gate)

## Rủi ro và cách xử lý
| Rủi ro | Xử lý |
|---|---|
| LLM trích ra điều hiển nhiên | Luật 1-2 trong prompt, eval theo tỉ lệ novelty, few-shot từ tài liệu thật |
| LLM bịa trích dẫn | Kiểm tra quote là chuỗi con, loại bỏ nếu không khớp |
| Đồ thị rối khi nhiều nút | Gom nhóm theo category, chỉ hiện downstream của nút chọn |
| Demo hỏng mạng | Cache + chế độ offline |
| Điểm rủi ro bị coi là chính xác | Nhãn "ước tính", chỉ dùng để xếp thứ tự |

## Sau MVP (chỉ làm nếu qua cổng quyết định)
- Tích hợp GitHub/Jira/Notion để tự đọc ADR, PR, ticket
- Hạn kiểm chứng (TTL) và nhắc nhở
- Theo dõi tín hiệu ngoài (changelog API, kết quả A/B) để tự gợi ý giả định đã sai

## Prompt khởi động cho agent (dán vào Antigravity hoặc Claude Code ở thư mục gốc)
```
Đọc GEMINI.md (hoặc CLAUDE.md) và PLAN.md. Thực hiện Phase 0, sau đó Phase 1 theo đúng thứ tự.
Dùng các skill trong .agents/skills (hoặc .claude/skills) theo bảng routing. Dừng khi đạt "Done when" của mỗi phase
và báo cáo ngắn gọn: đã làm gì, test nào pass, quyết định nào cần tôi duyệt.
```
