# Repo, thư viện và tài liệu tham khảo

## Skill và agent
| Nguồn | Dùng để làm gì |
|---|---|
| https://github.com/anthropics/skills | Kho skill chính thức của Anthropic, có `template/` và `spec/`. Cài thêm: `/plugin marketplace add anthropics/skills` |
| https://agentskills.io | Chuẩn Agent Skills (định dạng SKILL.md) |
| https://docs.claude.com | Tài liệu Claude API, tool use, structured output |

Skill đã nằm sẵn trong `.claude/skills/`:
`assumption-extractor`, `impact-propagation`, `graph-ui`, `extraction-eval`, `demo-builder` (viết riêng cho dự án), và `frontend-design`, `skill-creator`, `architecture`, `testing-strategy`, `code-review`, `debug`, `system-design` (sao chép từ môi trường hiện tại).
Lưu ý giấy phép: kiểm tra `LICENSE.txt` trong từng thư mục skill trước khi phát hành lại.

## Thư viện chính
| Việc | Gói | Ghi chú |
|---|---|---|
| Vẽ đồ thị | `@xyflow/react` (React Flow) | Dễ nhất cho nút tùy biến và animation |
| Bố cục tự động | `dagre` hoặc `elkjs` | dagre đủ cho MVP |
| State | `zustand` | Chọn selector để suy ra `needs_review` |
| Validate | `zod` | Schema đầu ra của LLM |
| LLM | `@anthropic-ai/sdk` | Dùng tool use để ép JSON |
| DB | `better-sqlite3` hoặc file JSON | Đủ cho MVP |
| Test | `vitest` | Test thuần cho `graph.ts` |

## Công cụ gần giống để học hỏi (không phải đối thủ trực tiếp)
- Assumption mapping (Lean Startup, Strategyzer): tư duy liệt kê giả định, làm thủ công
- ADR tooling (adr-tools, log4brains): ghi quyết định kiến trúc
- Backstage, dependency graph tools: đồ thị phụ thuộc kỹ thuật, tham khảo UX

Nên kiểm tra phiên bản và trạng thái mới nhất của từng gói trước khi cài (`npm view <gói> version`).
