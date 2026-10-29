# Assumption Debt

Công cụ biến giả định chưa kiểm chứng thành đồ thị có thể theo dõi: bác bỏ một giả định, thấy ngay các quyết định phía sau cần xem lại.

## Cấu trúc
```
.agents/skills/   skill cho Antigravity (Google DeepMind)
.claude/skills/   skill cho Claude Code
GEMINI.md         chỉ dẫn và bảng chọn skill cho Antigravity / Gemini
CLAUDE.md         chỉ dẫn và bảng chọn skill cho Claude Code
PLAN.md           kế hoạch theo phase, có "Done when"
docs/REPOS.md     repo, thư viện, tham khảo
data/demo/        PRD mẫu + seed.json
data/fixtures/    tài liệu thật để đánh giá trích xuất
```

## Bắt đầu
1. Giải nén, `cd assumption-debt`, `git init`
2. Mở Antigravity hoặc Claude Code tại thư mục này (skill trong `.agents/skills/` tự được Antigravity nhận diện)
3. Dán prompt khởi động ở cuối `PLAN.md`
4. Kiểm tra lõi logic bất cứ lúc nào: `python .agents/skills/impact-propagation/scripts/propagate.py --selftest`

## Quản lý skill
- Mỗi skill là một thư mục có `SKILL.md`; sửa trực tiếp trong repo, commit cùng code
- Tạo/chỉnh skill mới bằng skill `skill-creator`
- Dùng chung giữa nhiều dự án: copy sang `~/.claude/skills/`
