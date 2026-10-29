# Assumption Debt - Agent Instructions (Antigravity & Gemini)

## What we are building
A tool that extracts unverified assumptions from project documents, links them to the decisions and tasks that depend on them (a graph), and shows what must be re-examined when an assumption is refuted. Plus a risk ranking ("assumption debt") of what to verify first.

## Non-negotiables
1. The human decides. The LLM only proposes (status `proposed` until confirmed).
2. Every extracted assumption has a verbatim source quote; drop items whose quote is not in the input.
3. Graph logic lives in pure functions in `src/lib/graph.ts` with unit tests. UI never re-implements it.
4. Scores are for ordering only. Label them "estimated". One decimal max.
5. Demo must work offline (cached extraction + seed data).
6. Never hardcode API keys or model names: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` from env.

## Stack
Next.js (App Router), TypeScript, Tailwind, `@xyflow/react`, dagre, zustand, zod, vitest, `@anthropic-ai/sdk`, SQLite (better-sqlite3) or a JSON file for MVP.

## Skill routing (in `.agents/skills/`)
| When the task is about... | Use skill |
|---|---|
| Extracting assumptions, the prompt, review inbox logic | `assumption-extractor` |
| Graph model, refute, cascade, risk score, tests for them | `impact-propagation` |
| Graph/review/debt UI, animation | `graph-ui` + `frontend-design` |
| Quality measurement with real documents | `extraction-eval` |
| Demo, pitch, seed/reset | `demo-builder` |
| Design decisions worth recording | `architecture` (write ADRs to `docs/adr/`) |
| Test planning | `testing-strategy` |
| Reviewing a change before merge | `code-review` |
| Failing test or bug | `debug` |
| Creating or improving a skill | `skill-creator` |

## Working agreement
- Follow `PLAN.md` phase by phase. Finish a phase's "Done when" before starting the next.
- Commit per task with a clear message. Do not change `data/demo/seed.json` shape without updating `impact-propagation`.
- Record notable decisions as short ADRs in `docs/adr/`.
- When unsure about scope, choose the smaller option and note it in `docs/decisions.md`.

