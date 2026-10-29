---
name: graph-ui
description: Build the Assumption Debt interface - the React Flow dependency graph, the review inbox for proposed assumptions, the refute/validate action and the animated cascade that highlights affected decisions, plus the "assumption debt" summary panel. Use whenever the task touches graph visualization, node styling, layout, the refute interaction, the cascade animation, the review inbox, or the dashboard of risks. Also read frontend-design for visual polish.
---

# Graph UI

Stack: Next.js (App Router) + TypeScript + Tailwind + `@xyflow/react` (React Flow v12) + `dagre` or `elkjs` for auto layout.

## Screens (MVP = 3)
1. **Paste & Extract**: textarea / file drop -> "Extract assumptions" -> loading -> goes to Review.
2. **Review inbox**: cards of proposed assumptions. Each card: text, quote (highlighted), category, suggested importance, linked decisions. Actions: Confirm / Edit / Reject (keyboard: Enter / E / Backspace). Bulk "Confirm all high-confidence".
3. **Graph + Debt panel**: graph on the left, side panel on the right (selected node details, status buttons, risk ranking, total debt).

## Graph rules
- Layout: left-to-right, assumptions on the left, decisions in the middle, tasks on the right (dagre `rankdir: LR`).
- Node look: assumption = dashed border, size scaled by riskScore; decision = solid; task = small. Status color: unverified = amber, validated = green, refuted = red, needs_review = red outline + pulse.
- Never rely on color alone: add an icon or label for status (accessibility).
- Edges are `depends_on`; draw arrows toward the dependency.
- Selecting an assumption highlights its downstream and dims the rest.

## Refute interaction (the demo moment)
1. User clicks "Mark as refuted" on an assumption, optional note field for the evidence.
2. Compute `downstream()` from `src/lib/graph.ts` (never re-implement in the component).
3. Animate: refuted node turns red, then each depth layer turns `needs_review` with `delay = depth * 250ms`.
4. Show a toast/panel: "N items need review - X weeks of work at risk" with a list; each item has "Reviewed - still valid" to clear.
5. Respect `prefers-reduced-motion`: skip the animation, apply final state.

## Performance and state
- Keep graph state in a single store (zustand) with derived selectors; derive `needs_review`, never persist it.
- Memoize custom nodes. Fine up to ~300 nodes; above that, collapse by category.

## Done when
- Seed data loads, refuting `A1` highlights `D1, D2, T1` and shows 6.0 weeks.
- Works at 1280px and 390px width (graph becomes pan/zoom only, panel becomes bottom sheet).
- No console errors; Lighthouse accessibility >= 90.
