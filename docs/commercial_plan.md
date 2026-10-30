# Assumption Debt — Kế hoạch Phát triển Sản phẩm Thương mại (B2B SaaS Roadmap)

> **Mục tiêu:** Chuyển đổi Assumption Debt từ công cụ phân tích cục bộ (Local Tool) thành **Nền tảng Quản trị Rủi ro và Giả định Dự án (Assumption & Risk Governance Platform)** cho các nhóm Product & Engineering doanh nghiệp.
> **Nguyên tắc cốt lõi:** Giữ nguyên vẹn toàn bộ các tính năng và logic đã hoàn thành từ Phase 0 đến Phase 11. Các phase thương mại hóa chỉ mở rộng thêm tầng dữ liệu (cloud persistence), tầng nạp dữ liệu (ingestion), và tầng tích hợp (Jira/Linear/Slack).

---

## 1. Giá trị Cốt lõi & Định vị Khác biệt

* **Vấn đề thực tế:** Các nhóm phát triển lãng phí hàng tháng dev vì xây tính năng dựa trên những giả định sai lầm nhưng không được kiểm chứng.
* **Định vị so với Jira / Linear:**
  * *Jira / Linear:* Quản lý **CÁI GÌ ĐƯỢC LÀM** (Execution & Backlog) — ngầm coi mọi ticket là đúng.
  * *Assumption Debt:* Quản lý **TẠI SAO LÀM VÀ ĐỘ TIN CẬY CỦA NÓ** (Epistemology & Risk) — quản trị rủi ro đứng sau backlog.
* **Rào cản phòng thủ (Moat):** Không phải là giao diện vẽ đồ thị hay prompt LLM, mà là **Sự kết nối vòng lặp (Closed-Loop Workflow)**: Tự động cảnh báo và gắn cờ rủi ro lên các ticket Jira/Linear khi một giả định bị bác bỏ.

---

## 2. Kiến trúc Mục tiêu (Target Architecture)

```
[Nguồn tài liệu: Notion / Google Docs / GitHub PRs / PDF Upload]
                       │
                       ▼
         [Next.js API & Async Job Queue]
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
[LLM Router: Claude/Gemini]   [Deterministic Graph Engine (graph.ts)]
       │                               │
       └───────────────┬───────────────┘
                       │
                       ▼
       [PostgreSQL Multi-tenant Database]
       (Organizations, Workspaces, Projects, Nodes, Edges)
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
[Linear & Jira 2-way Sync]     [Slack Bot Alerts]
```

---

## 3. Các Phase Thương Mại Hóa Chi Tiết

### Phase 14: Nền tảng Đa người dùng & Lưu trữ Đám mây (Multi-tenant DB & Auth)
* **Mục tiêu:** Di chuyển từ `localStorage` lên PostgreSQL đám mây (Supabase / Neon), hỗ trợ làm việc nhóm.
* **Hạng mục triển khai:**
  - [ ] Thiết lập PostgreSQL với Drizzle ORM hoặc Prisma.
  - [ ] Schema đa người dùng: `Organization` $\rightarrow$ `Workspace` $\rightarrow$ `Project` $\rightarrow$ `Document` $\rightarrow$ `StoredNode` & `StoredEdge`.
  - [ ] Xác thực người dùng (Auth): Tích hợp Clerk hoặc Supabase Auth (hỗ trợ Google Workspace / GitHub OAuth).
  - [ ] API CRUD đồng bộ đồ thị từ Zustand lên Server Database, giữ nguyên fallback `localStorage` khi offline.
* **Done when:** Người dùng đăng nhập, tạo Project trên máy A, mở máy B thấy đúng đồ thị và trạng thái.

### Phase 15: Nạp Dữ liệu Không ma sát (Zero-Friction Ingestion)
* **Mục tiêu:** Xóa bỏ ma sát copy-paste thủ công.
* **Hạng mục triển khai:**
  - [ ] Kéo thả file trực tiếp: Hỗ trợ tệp `.pdf`, `.docx`, `.md` với bộ parser trích xuất text tự động.
  - [ ] Kết nối Notion API & Google Docs API qua OAuth2 để chọn tài liệu PRD trực tiếp.
  - [ ] GitHub App / Action: Tự động quét file Architecture Decision Record (`docs/adr/*.md`) hoặc PR Description khi mở Pull Request.
  - [ ] Async Job Queue: Dùng Inngest / Upstash xử lý tài liệu dài trong nền, tránh timeout.
* **Done when:** Kéo 1 file PDF hoặc chọn 1 trang Notion, hệ thống tự động trích xuất và đưa vào Hòm thư duyệt (Review Inbox).

### Phase 16: Tích hợp Hệ sinh thái & Đóng vòng lặp (Linear / Jira & Slack Bot)
* **Mục tiêu:** Biến kết quả phân tích thành hành động thực tế trong quy trình làm việc hàng ngày.
* **Hạng mục triển khai:**
  - [ ] Tích hợp Linear API & Jira REST API v3:
    - Nút 1-click đẩy Verification Tasks thành ticket trên Jira/Linear kèm link ngược về Assumption Debt.
    - **Cascade Sync:** Khi một Assumption bị **Bác bỏ (Refuted)** $\rightarrow$ tự động gắn nhãn `[ASSUMPTION FAILED]` hoặc cảnh báo trên các ticket Jira/Linear phụ thuộc.
  - [ ] Slack App / Bot:
    - Báo cáo định kỳ tuần "Weekly Assumption Debt".
    - Cảnh báo tức thì khi giả định quan trọng bị quá hạn kiểm chứng (`verifyBy`) hoặc bị bác bỏ.
* **Done when:** Bác bỏ $A_1$ trên app $\rightarrow$ Slack thông báo ngay lập tức và ticket liên quan trên Jira/Linear đổi trạng thái hoặc nhận cờ cảnh báo.

### Phase 17: Bảng điều khiển Quản trị & Phân tích (Analytics & Governance)
* **Mục tiêu:** Cung cấp số liệu đo lường trực quan cho ban lãnh đạo (CTO, VP of Product).
* **Hạng mục triển khai:**
  - [ ] Biểu đồ Giảm nợ giả định (Assumption Debt Burn-down Chart) theo quý/sprint.
  - [ ] Vận tốc kiểm chứng (Verification Velocity): Thời gian trung bình để xác thực hoặc bác bỏ một giả định.
  - [ ] Nhật ký kiểm toán (Audit Trail): Lưu vết chi tiết ai đã xác nhận, chỉnh sửa hoặc bác bỏ kèm bằng chứng.
* **Done when:** Xuất được báo cáo PDF/Web cho cuộc họp Sprint Review với các biểu đồ xu hướng rủi ro.

### Phase 18: Thương mại hóa & Tiêu chuẩn Doanh nghiệp (Monetization & Enterprise)
* **Mục tiêu:** Thu phí định kỳ (SaaS Subscriptions) và sẵn sàng bán cho doanh nghiệp.
* **Hạng mục triển khai:**
  - [ ] Cổng thanh toán Stripe (Tier Free, Team \$15/seat/tháng, Enterprise).
  - [ ] SSO / SAML (Okta, Azure AD).
  - [ ] Tùy chọn BYOK (Bring Your Own Key) cho LLM để đảm bảo quyền riêng tư dữ liệu nội bộ.
* **Done when:** Người dùng có thể nâng cấp gói Pro/Team qua Stripe và quản lý thành viên trong tổ chức.
