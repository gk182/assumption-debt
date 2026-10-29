---
name: assumption-extractor
description: Extract implicit, unverified assumptions from project documents (PRD, ADR, ticket, PR description, meeting notes, Slack export) and propose which decisions depend on them. Use whenever the task involves pulling assumptions, beliefs, hidden risks or "things we think are true" out of text, designing or tuning the LLM extraction prompt, writing the extraction API route, or the review inbox that lets a human confirm/edit/reject extracted assumptions. Use it even if the user only says "analyze this PRD for risks".
---

# Assumption Extractor

Turns unstructured text into a reviewable list of assumptions plus candidate links to decisions.

## Core principle
Humans will not type assumptions by hand. The tool proposes, the human only **confirms / edits / rejects**.
Quality bar: a reviewer should react "I never checked that" to at least 1 in 3 items. Obvious truisms are failures.

## Workflow
1. Read `references/extraction-prompt.md` (system prompt + rules). Do not improvise a new prompt; edit that file instead.
2. Read `references/output-schema.md`. Define the zod schema in `src/lib/schema.ts` to match it exactly.
3. Call the Anthropic API with **tool use / structured output** so the response is validated JSON. Model name comes from env `ANTHROPIC_MODEL` (never hardcode).
4. Validate with zod. On failure retry once with the validation error appended; then surface the error to the UI.
5. Chunk long documents by heading (max ~6k tokens per chunk), extract per chunk, then dedupe (normalize text, then cosine/LLM merge if needed).
6. Every assumption MUST carry `source.quote` copied verbatim from the input. Drop any item whose quote is not a substring of the input (hallucination guard).
7. Return `status: "proposed"`. Nothing becomes `unverified` until a human confirms.

## What counts as an assumption
- About user behavior ("users will pay", "they will read the email")
- About a technical dependency ("the API is stable", "latency stays under 200ms")
- About data ("data is complete", "IDs are unique")
- About market/business ("competitors won't copy")
- About resources/timeline ("2 devs are enough")
- About legal/compliance

## What to ignore
Definitions, facts already backed by cited evidence, pure requirements ("the system must..."), and generic statements that apply to every project.

## Signals (Vietnamese + English)
"chắc là", "mình nghĩ", "giả sử", "dự kiến", "sẽ luôn", "người dùng sẽ", "không cần", "should be fine", "we assume", "probably", "obviously", "users will", "always", "never".
Implicit assumptions often hide behind a decision with no justification: find the decision, ask "what must be true for this to be right?".

## Done when
- Unit test with 3 fixture docs in `data/fixtures/` passes (schema valid, quotes are substrings).
- Run the `extraction-eval` skill on the fixtures and record the scores in `docs/eval-log.md`.
