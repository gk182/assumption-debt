---
name: impact-propagation
description: Core graph logic for Assumption Debt - data model for assumptions/decisions/tasks, edge direction, refuting an assumption and computing everything downstream, effort at risk, and risk scoring to rank which assumptions to verify first. Use whenever writing or changing the graph schema, the refute/validate flow, cascade (BFS/DFS) code, risk score, the "assumption debt" total, or tests for any of these. Use it even for small tweaks to scoring.
---

# Impact Propagation

## Model
Three node types: `assumption`, `decision`, `task`. One edge type for MVP: `depends_on`.
Edge direction: **dependent -> dependency** (`D1 depends_on A1` is `{from: D1, to: A1}`).
Propagation runs on the **reversed** graph: from a refuted node, collect everything that transitively depends on it.

Node fields: see `data/demo/seed.json` (the single source of truth for shape).

## Rules
- Only a **human** changes status (`unverified -> validated | refuted`). The LLM may propose, never decide.
- Refuting an assumption marks downstream nodes `needs_review` (a derived flag, not stored on the node). Do not auto-delete or auto-modify anything.
- Cycles must not crash: use a visited set. Show a warning if a cycle is detected.
- An assumption may depend on another assumption (chains are allowed).
- A node reached through multiple paths is counted once.

## Metrics
- `downstreamEffortWeeks(a)` = sum of `effortWeeks` over unique downstream nodes.
- `riskScore(a)` = `(1 - confidence) * (importance / 5) * downstreamEffortWeeks(a)`, only for `unverified`.
- `assumptionDebt` = sum of `riskScore` over unverified assumptions (show with "estimated" label).
- Overdue = `verifyBy` is in the past and status is still `unverified`.
Scores are for **ordering**, not accuracy. UI must say so. Never display more than 1 decimal.

## Workflow
1. Implement in `src/lib/graph.ts` as pure functions (no DB, no React).
2. Port from the reference in `scripts/propagate.py` (run it first to see expected output on the seed data).
3. Write unit tests (vitest) covering: simple cascade, diamond (counted once), cycle, validated nodes are not flagged, refuting a leaf affects nothing, risk ordering on seed data.
4. Expected on seed: refuting `A1` => downstream `D1, D2, T1`, effort `6.0` weeks.

See `references/algorithm.md` for pseudocode and edge cases.
