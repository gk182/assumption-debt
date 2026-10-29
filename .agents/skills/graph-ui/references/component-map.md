# Suggested component map
```
src/app/page.tsx                 paste & extract
src/app/review/page.tsx          review inbox
src/app/graph/page.tsx           graph + panel
src/components/AssumptionNode.tsx / DecisionNode.tsx / TaskNode.tsx
src/components/DebtPanel.tsx     ranking + total
src/components/CascadeToast.tsx
src/lib/graph.ts                 pure functions (impact-propagation skill)
src/lib/store.ts                 zustand
src/lib/schema.ts                zod (assumption-extractor skill)
src/lib/db.ts                    SQLite (better-sqlite3) or JSON file for MVP
src/app/api/extract/route.ts     calls Anthropic
```
