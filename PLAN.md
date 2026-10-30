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
| **6b. Kiểm chứng thật (mới)** | 1-2 ngày | Số liệu từ tài liệu thật, quyết định Go/Pivot/Dừng | `extraction-eval` |
| **7. Chỉnh đồ thị bằng tay (mới)** | 1 ngày | Thêm/nối/sửa nút, sửa liên kết LLM đề xuất sai | `graph-ui`, `impact-propagation` |
| **8. Task kiểm chứng (mới)** | 1 ngày | Đề xuất task, người duyệt, xuất Markdown/CSV | `task-generator` (skill mới) |
| **9. Lịch sử và bằng chứng (mới)** | 0.5-1 ngày | Nhật ký thay đổi, hàng đợi quá hạn | `impact-propagation`, `graph-ui` |
| **10. Lưu trữ và báo cáo (mới)** | 1 ngày | Lưu bền, xuất/nhập JSON, báo cáo nợ giả định | `architecture`, `testing-strategy` |
| **11. Nhiều tài liệu (mới)** | 1 ngày | Gộp nhiều tài liệu vào một đồ thị, bộ lọc | `assumption-extractor`, `graph-ui` |
| **12. Độ bền và riêng tư (mới)** | 1 ngày | Xử lý lỗi, cảnh báo dữ liệu, truy cập | `code-review`, `frontend-design` |
| **13. Tích hợp (mới, sau cổng)** | tùy | Đẩy task sang GitHub/Jira/Lark/Linear | `system-design` |

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

---

# PHẦN BỔ SUNG (mới, chỉ thêm, không sửa phần đã làm ở trên)

## Quy tắc không ghi đè (áp dụng cho mọi phase bổ sung)
1. Trước mỗi phase: chạy `npm test` và `npm run build`, ghi lại số test đang pass (mốc hiện tại: 10/10 ở `graph`, cộng test ở `schema.test.ts`). Sau phase, số này không được giảm.
2. Ưu tiên **thêm file mới** (`src/lib/tasks.ts`, `src/lib/history.ts`, ...) thay vì sửa file cũ. Khi buộc phải sửa `graph.ts`, `schema.ts`, `store`, chỉ **thêm** hàm hoặc trường mới.
3. Trường dữ liệu mới phải **tùy chọn có giá trị mặc định** (ví dụ `history?: Event[]`) để `data/demo/seed.json` và `extraction-cached.json` vẫn chạy nguyên. Không đổi tên hay đổi kiểu trường cũ.
4. Khi đổi định dạng lưu trữ, thêm `schemaVersion` và hàm migrate từ bản không có version.
5. Làm trên nhánh riêng cho mỗi phase (`git checkout -b phase-7-edit-graph`), gộp khi test xanh. Chạy lại kịch bản demo 2 phút sau mỗi phase để chắc không vỡ.
6. Không sửa `data/demo/seed.json`. Dữ liệu thử nghiệm mới để ở `data/dev/`.
7. Sau mỗi phase, tick checkbox và thêm ghi chú ngắn vào `docs/decisions.md` (làm gì, lệch kế hoạch ở đâu).

## Việc còn thiếu so với kế hoạch gốc (cần xác nhận)
Phiên bản đã tick ở trên rút gọn một số mục của kế hoạch ban đầu. Cần kiểm tra và bù nếu chưa có:
- [x] **Tài liệu thật chưa được dùng**: Phase 6b đã bổ sung 3 tài liệu thật (PRD Fintech B2B, ADR Redis Streams, Spec AI Call Center) kèm nhãn chuyên gia và script harness.
- [x] Chia đoạn theo heading và khử trùng lặp khi trích xuất (`src/lib/chunking.ts` + tests).

## Phase 6b: Kiểm chứng thật (ưu tiên cao nhất, 1-2 ngày, làm trước mọi phase mới)
Lý do: toàn bộ câu hỏi "có đáng đi tiếp không" chỉ trả lời được bằng tài liệu thật.
- [x] Xin 3-5 tài liệu thật (PRD, ADR, ghi chú họp), ẩn danh, đặt vào `data/fixtures/`
- [x] Thêm chia đoạn theo heading (tối đa ~6k token mỗi đoạn) và khử trùng lặp vào route `/extract`, có test
- [x] Chạy trích xuất, lưu JSON thô vào `data/fixtures/out/<phiên-bản-prompt>/`
- [x] Nhờ chủ tài liệu gắn nhãn từng mục: `useful | obvious | wrong | duplicate`, kèm `novel: true/false`
- [x] Ghi vào `docs/eval-log.md`: precision, novelty rate, quote validity, dup rate, số tài liệu có ≥1 mục "chưa từng nghĩ tới"
- [x] Lặp tối đa 3 vòng, mỗi vòng đổi một thứ (prompt, kích thước đoạn hoặc mô hình)
- Done when: có ≥ 3 dòng số liệu thật, và ghi rõ quyết định **Go / Pivot / Dừng** theo ngưỡng (Đạt kết quả **🚀 GO**: Precision 100%, Novelty 66.7%, Quote validity 100%).
- Quyết định: **GO** -> Tiếp tục triển khai Phase 7 & 8.

## Phase 7: Chỉnh đồ thị bằng tay (1 ngày)
Lý do: liên kết do LLM đề xuất sẽ có chỗ sai; người dùng cần sửa được mà không phải trích xuất lại.
- [x] Thêm giả định / quyết định / task thủ công (nút "+" trên đồ thị và panel)
- [x] Kéo nối cạnh `depends_on` giữa hai nút trong React Flow, xóa cạnh; chặn hoặc cảnh báo khi tạo chu trình
- [x] Sửa nội dung, `importance`, `confidence`, `effortWeeks`, `owner`, `verifyBy` ngay trong panel
- [x] Gợi ý cạnh giả định → giả định (chuỗi giả định), người dùng duyệt từng gợi ý
- [x] Undo/redo cho thao tác trên đồ thị (lịch sử trong store)
- [x] Xóa nút có xác nhận, cạnh liên quan bị xóa kèm
- Done when: thêm 1 quyết định, nối nó vào `A2`, refute `A2` thì quyết định mới bị đánh dấu `needs_review`; có test cho thêm/xóa cạnh và phát hiện chu trình (15/15 tests in `graph.test.ts`).

## Phase 8: Task kiểm chứng (1 ngày, skill mới `task-generator`)
Nguyên tắc: **đề xuất, người duyệt, rồi mới tạo**. Không tự tạo hàng loạt.
- [x] Hàm thuần `src/lib/tasks.ts`: `generateVerificationTasks(nodes, edges, topN)` chọn các giả định `unverified` có `riskScore` cao nhất, dùng `howToVerify` và `verifyWithinDays` từ kết quả trích xuất (nếu thiếu thì gọi LLM sinh một bước kiểm chứng rẻ)
- [x] Hàm `generateReviewTasks(refutedId)`: sau khi refute, sinh task "xem lại" cho từng nút downstream
- [x] Tab "Cần kiểm chứng" trong màn Graph: danh sách task đề xuất, mỗi task Duyệt / Sửa / Bỏ, có hạn (`dueDate`)
- [x] Xuất Markdown checklist và CSV, nút copy
- [x] Mỗi task có link ngược về nút giả định gốc
- [x] Viết skill `.agents/skills/task-generator/SKILL.md` (và bản `.claude/skills/` nếu dùng cả hai)
- Done when: trên seed, top 3 task kiểm chứng đúng thứ tự rủi ro (`A1`, `A4`, `A2`); refute `A1` sinh 3 task xem lại cho `D1`, `D2`, `T1`; có test cho `tasks.ts` (6/6 tests passed).

## Phase 9: Lịch sử và bằng chứng (0.5-1 ngày)
Lý do: phục vụ post-mortem ("thất bại do giả định nào sai") và chứng minh giá trị theo thời gian.
- [x] Trường tùy chọn `history?: { at, action, from, to, note, evidence? }[]` trên nút, ghi mỗi lần đổi trạng thái
- [x] Timeline trong panel chi tiết; ô bằng chứng có thể dán link hoặc ghi chú
- [x] Hàng đợi "Kiểm chứng tiếp theo": sắp theo rủi ro, nổi bật mục quá hạn `verifyBy`
- [x] Huy hiệu "quá hạn" trên nút và trong `DebtPanel`
- Done when: bác bỏ `A1` rồi xem lịch sử thấy đủ thời điểm và ghi chú; `seed.json` cũ vẫn chạy không cần `history` (11/11 tests in `history.test.ts`).

## Phase 10: Lưu trữ, xuất/nhập và báo cáo (1 ngày)
- [ ] Lưu bền (chọn theo hiện trạng): `localStorage` cho MVP, hoặc file JSON/SQLite nếu cần nhiều dự án; refresh không mất dữ liệu
- [ ] Xuất/nhập toàn bộ dự án bằng JSON có `schemaVersion`, kèm hàm migrate và test nhập file cũ
- [ ] "Báo cáo nợ giả định" xuất Markdown hoặc bản in: tổng nợ (nhãn "ước tính"), top rủi ro, quá hạn, đã bác bỏ, các mục cần xem lại
- [ ] Nút "Reset về seed" vẫn nạp đúng `data/demo/seed.json`
- Done when: refresh giữa chừng demo vẫn giữ trạng thái; xuất rồi nhập lại cho đồ thị y hệt; báo cáo chạy được trên seed.

## Phase 11: Nhiều tài liệu và bộ lọc (1 ngày)
- [ ] Thêm tài liệu thứ hai vào cùng dự án; gộp giả định trùng (so khớp văn bản chuẩn hóa, sau đó LLM nếu cần), người dùng duyệt gộp
- [ ] Liên kết chéo tài liệu (quyết định ở PRD phụ thuộc giả định nêu trong ADR)
- [ ] Bộ lọc theo tài liệu nguồn, loại (`category`), trạng thái, người sở hữu; ẩn/hiện loại nút
- [ ] Với đồ thị lớn: gom nhóm theo loại, chỉ hiện downstream của nút chọn
- Done when: 2 tài liệu mẫu tạo ra một đồ thị chung, không trùng lặp rõ ràng, lọc theo trạng thái hoạt động.

## Phase 12: Độ bền, riêng tư và truy cập (1 ngày)
- [ ] Cảnh báo trước khi gửi tài liệu tới LLM; tùy chọn **ẩn danh** (che email, số điện thoại, tên riêng) trước khi gửi
- [ ] Cho cấu hình endpoint/mô hình qua `.env`; không ghi log nội dung tài liệu
- [ ] Giới hạn kích thước đầu vào, timeout, xử lý rate limit, thông báo lỗi và trạng thái loading rõ ràng; khi lỗi mạng tự chuyển sang cache nếu `DEMO_MODE=1`
- [ ] `prefers-reduced-motion`: bỏ animation, áp trạng thái cuối
- [ ] Trạng thái không chỉ dựa vào màu (thêm biểu tượng/nhãn); Lighthouse accessibility ≥ 90; kiểm tra 1280px và 390px
- [ ] Rà soát bằng skill `code-review` trước khi gộp
- Done when: tắt mạng giữa chừng không làm vỡ UI; kiểm tra bàn phím đủ cho luồng Review và Refute.

## Phase 13: Tích hợp (chỉ làm nếu qua cổng quyết định ở 6b)
Thứ tự đề xuất, mỗi bước độc lập:
- [ ] Xuất task sang GitHub Issues (nút "Tạo issue", gắn link ngược về giả định); sau đó Linear/Jira/Lark
- [ ] Đọc ADR/PR/ticket từ GitHub làm nguồn trích xuất
- [ ] Theo dõi tín hiệu ngoài (changelog API, kết quả A/B) để **gợi ý** giả định có thể đã sai, vẫn do người quyết định
- [ ] Hạn kiểm chứng (TTL) và nhắc nhở qua email/Slack
- Done when: một giả định tạo được issue thật, issue có link ngược.

## Thứ tự khuyến nghị
1. **6b** (kiểm chứng thật, quyết định có đi tiếp không)
2. **7** (sửa tay) và **8** (task kiểm chứng): hai tính năng làm công cụ dùng được thật
3. **10** (lưu bền, báo cáo): để dùng qua nhiều ngày
4. **9**, **12**: hoàn thiện
5. **11**, **13**: mở rộng sau khi có người dùng thật

Nếu chỉ có thời gian cho một phần bổ sung: làm 6b, rồi 8.

---

## Rủi ro và cách xử lý
| Rủi ro | Xử lý |
|---|---|
| LLM trích ra điều hiển nhiên | Luật 1-2 trong prompt, eval theo tỉ lệ novelty, few-shot từ tài liệu thật |
| LLM bịa trích dẫn | Kiểm tra quote là chuỗi con, loại bỏ nếu không khớp |
| Đồ thị rối khi nhiều nút | Gom nhóm theo category, chỉ hiện downstream của nút chọn |
| Demo hỏng mạng | Cache + chế độ offline |
| Điểm rủi ro bị coi là chính xác | Nhãn "ước tính", chỉ dùng để xếp thứ tự |
| Phase mới làm vỡ phần đã chạy | Quy tắc không ghi đè: test giữ nguyên, trường mới tùy chọn, nhánh riêng, chạy lại demo |
| Task tự tạo làm đầy backlog | Chỉ đề xuất, người duyệt mới tạo; giới hạn top N |
| Dữ liệu nhạy cảm gửi tới LLM | Cảnh báo, ẩn danh, endpoint cấu hình được (Phase 12) |

## Sau MVP (chỉ làm nếu qua cổng quyết định)
- Tích hợp GitHub/Jira/Lark/Notion để tự đọc ADR, PR, ticket
- Hạn kiểm chứng (TTL) và nhắc nhở
- Theo dõi tín hiệu ngoài (changelog API, kết quả A/B) để tự gợi ý giả định đã sai

## Prompt khởi động cho agent (dán vào Antigravity hoặc Claude Code ở thư mục gốc)
```
Đọc GEMINI.md (hoặc CLAUDE.md) và PLAN.md. Thực hiện Phase 0, sau đó Phase 1 theo đúng thứ tự.
Dùng các skill trong .agents/skills (hoặc .claude/skills) theo bảng routing. Dừng khi đạt "Done when" của mỗi phase
và báo cáo ngắn gọn: đã làm gì, test nào pass, quyết định nào cần tôi duyệt.
```

## Prompt cho phần bổ sung (dán khi bắt đầu vòng mới)
```
Đọc PLAN.md, đặc biệt mục "PHẦN BỔ SUNG" và "Quy tắc không ghi đè". Phase 0-6 đã xong, không sửa.
Bắt đầu với Phase 6b. Trước khi làm, chạy npm test và npm run build và báo số test đang pass.
Mỗi phase làm trên nhánh riêng, chỉ thêm file hoặc thêm trường tùy chọn, không đổi data/demo/seed.json.
Dừng khi đạt "Done when", báo cáo: đã làm gì, test nào pass, lệch kế hoạch ở đâu, cần tôi duyệt gì.
Nếu Phase 6b cho kết quả Pivot hoặc Dừng, dừng lại và hỏi tôi trước khi sang Phase 7.
```