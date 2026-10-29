# ADR-001: Next.js App Router, React Flow và Pure Graph Core

**Status:** Accepted  
**Date:** 2026-10-29  
**Deciders:** Team Assumption Debt  

## Context
Dự án cần xây dựng công cụ trích xuất giả định từ tài liệu dự án, xây dựng đồ thị phụ thuộc giữa Giả định (Assumption) - Quyết định (Decision) - Công việc (Task), và lan truyền tác động (cascade) khi một giả định bị bác bỏ. Yêu cầu sản phẩm:
1. Con người là người quyết định cuối cùng, LLM chỉ đề xuất.
2. Mọi giả định phải có quote nguyên văn từ tài liệu nguồn.
3. Logic đồ thị sống độc lập trong `src/lib/graph.ts` và có test đầy đủ.
4. Demo phải chạy được 100% offline (dữ liệu seed + cached).

## Decision
1. **Frontend / Backend**: Dùng **Next.js (App Router)** với TypeScript và Tailwind CSS.
2. **Graph Visualization**: Dùng **`@xyflow/react`** (React Flow v12) kết hợp với `dagre` để tính toán layout phân tầng tự động (Left-to-Right).
3. **Graph Engine**: Viết thuần bằng TypeScript functional trong `src/lib/graph.ts` (không dính React hooks hay UI logic). Sử dụng `vitest` cho test suite.
4. **State Management**: Dùng `zustand` cho tương tác reactive trên client (lọc, chọn node, trigger cascade animation).
5. **Schema Validation**: Dùng `zod` để bảo đảm type safety giữa LLM response và hệ thống.

## Options Considered
### Option A: Next.js App Router + React Flow + Pure TS Graph
- **Pros:** Fullstack trong một repo duy nhất, API routes sẵn sàng, React Flow hỗ trợ custom nodes và animated edges tốt nhất hệ sinh thái React.
- **Cons:** Cần cấu hình bundler cẩn thận cho SSR (Next.js client components).

### Option B: Vite + React SPA + Express Backend
- **Pros:** Đơn giản, tách biệt frontend và backend.
- **Cons:** Cần chạy 2 tiến trình riêng, phức tạp hơn cho người dùng khi clone demo.

## Consequences
- Hệ thống dễ đóng gói, chạy được offline hoàn toàn chỉ với `npm run dev`.
- Logic đồ thị có thể tái sử dụng ở bất cứ đâu (client, server, worker script).
