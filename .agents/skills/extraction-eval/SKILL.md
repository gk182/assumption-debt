---
name: extraction-eval
description: Measure and improve the quality of assumption extraction using real documents and human labels - gold set format, precision, novelty rate, quote-validity check, prompt iteration log. Use whenever the task is about testing extraction quality, validating the product idea with real users' documents, comparing prompts or models, or deciding whether the idea is worth continuing.
---

# Extraction Eval

Goal: answer the business question "does this surface things people had not thought about?" with numbers.

## Gold set
`data/fixtures/<name>.md` (the document) + `data/fixtures/<name>.labels.json`:
```json
{ "items": [ { "text": "...", "verdict": "useful | obvious | wrong | duplicate", "novel": true } ] }
```
Source: 3-5 real documents from friends/teams (anonymize first). A human labels each extracted item.

## Metrics (write to `docs/eval-log.md` with date + prompt version + model)
| Metric | Definition | Go threshold |
|---|---|---|
| Precision | useful / total extracted | >= 0.6 |
| Novelty rate | novel / total extracted | >= 0.33 |
| Quote validity | items whose quote is a substring of the doc | 1.0 (hard) |
| Dup rate | duplicates / total | <= 0.1 |
| Docs with >=1 "I never checked that" | docs / total docs | >= 0.6 |

## Workflow
1. Run extraction on every fixture, store raw JSON in `data/fixtures/out/<prompt-version>/`.
2. Auto-check quote validity and schema; fail loudly.
3. Human labels items (a simple CLI or the review UI export is enough).
4. Compute metrics, append a row to `docs/eval-log.md`.
5. Change **one** thing per iteration (prompt wording, chunk size, model). Re-run. Keep the table.
6. Decision gate: if novelty rate < 0.2 after 3 iterations, stop and revisit the idea (pivot to "pre-mortem generator" or drop).

## Anti-patterns
Do not label your own LLM output as useful because it sounds smart; label with someone who owns the document.
