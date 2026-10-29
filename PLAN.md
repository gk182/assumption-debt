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
- [ ] `npx create-next-app@latest` (TS, Tailwind, App Router) vào thư mục này, giữ nguyên `.claude/`, `data/`, `docs/`
- [ ] Cài: `@xyflow/react dagre zustand zod @anthropic-ai/sdk better-sqlite3` và dev: `vitest @types/dagre`
- [ ] `.env.example` với `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `DEMO_MODE`
- [ ] Scripts: `test`, `seed`, `reset`
- Done when: `npm run dev` và `npm test` chạy được.

## Phase 1: Lõi đồ thị (1 ngày)
- [ ] `src/lib/types.ts`, `src/lib/graph.ts`: `downstream`, `effortAtRisk`, `riskScore`, `debtTotal`, `needsReview`
- [ ] Port từ `.claude/skills/impact-propagation/scripts/propagate.py`
- [ ] Test: cascade đơn giản, kim cương, chu trình, nút đã validated, refute nút lá, thứ hạng rủi ro
- Done when: refute `A1` trên seed => `D1, D2, T1`, 6.0 tuần.

## Phase 2: Trích xuất LLM (1 ngày)
- [ ] `src/lib/schema.ts` (zod) theo `references/output-schema.md`
- [ ] `src/app/api/extract/route.ts` dùng tool use, retry 1 lần khi sai schema
- [ ] Bộ lọc chống bịa: bỏ item có quote không nằm trong văn bản
- [ ] Chia đoạn theo heading, khử trùng lặp
- [ ] Cache kết quả cho demo: `data/demo/extraction-cached.json`
- Done when: 3 tài liệu mẫu cho JSON hợp lệ, quote 100% hợp lệ.

## Phase 3: UI (2 ngày)
- [ ] Màn Paste & Extract
- [ ] Review inbox (Confirm / Edit / Reject, phím tắt)
- [ ] Graph React Flow, bố cục trái sang phải, 3 loại nút, chọn nút để làm nổi downstream
- [ ] Panel bên phải: chi tiết nút, nút đổi trạng thái, xếp hạng rủi ro
- Done when: luồng dán tài liệu đến graph chạy liền mạch trên 1280px và 390px.

## Phase 4: Refute + cascade (1 ngày)
- [ ] Nút "Bác bỏ" có ô ghi bằng chứng
- [ ] Animation theo lớp (độ trễ = depth × 250ms), hỗ trợ reduced-motion
- [ ] Toast: "N mục cần xem lại, X tuần công việc bị ảnh hưởng"
- [ ] "Đã xem lại, vẫn đúng" để xóa cờ
- Done when: khoảnh khắc demo ở bước 5 trong `demo-builder` chạy mượt.

## Phase 5: Demo (0.5 ngày)
- [ ] `npm run seed` / `npm run reset`, chế độ offline `DEMO_MODE=1`
- [ ] Diễn tập 3 lần dưới 2 phút, quay video backup 30 giây

## Phase 6: Kiểm chứng (song song, bắt đầu từ ngày 2)
- [ ] Xin 3-5 tài liệu thật (PRD, ADR, ghi chú họp), ẩn danh
- [ ] Chạy trích xuất, nhờ chủ tài liệu gắn nhãn từng mục
- [ ] Ghi chỉ số vào `docs/eval-log.md`
- **Cổng quyết định**: tỉ lệ "chưa từng nghĩ tới" ≥ 33% và ≥ 60% tài liệu có ít nhất 1 mục như vậy thì đáng đi tiếp. Dưới 20% sau 3 vòng chỉnh prompt thì đổi hướng (ví dụ "pre-mortem generator") hoặc dừng.

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
