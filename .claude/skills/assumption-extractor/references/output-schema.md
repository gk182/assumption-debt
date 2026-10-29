# Extraction output schema

```json
{
  "assumptions": [
    {
      "tempId": "a1",
      "text": "Short declarative sentence, max 140 chars, written as a claim that could be false",
      "category": "user_behavior | technical_dependency | data | market | resource_timeline | legal",
      "source": { "quote": "verbatim substring of the input", "location": "heading or line hint" },
      "evidenceInDoc": "none | weak | strong",
      "suggestedImportance": 1,
      "whyItMatters": "one sentence: what breaks if false",
      "howToVerify": "one concrete cheap check",
      "verifyWithinDays": 14
    }
  ],
  "decisions": [
    {
      "tempId": "d1",
      "text": "A decision, feature or task the document commits to",
      "kind": "decision | feature | task",
      "source": { "quote": "verbatim", "location": "..." },
      "estimatedEffortWeeks": 1
    }
  ],
  "links": [
    { "from": "d1", "to": "a1", "relation": "depends_on", "reason": "one sentence" }
  ]
}
```

Rules
- `suggestedImportance` 1-5 (5 = product fails if wrong).
- `estimatedEffortWeeks` is a rough guess; the UI marks it editable and "estimated".
- `links.from` is the dependent thing, `links.to` is what it depends on. Never invert.
- Max 25 assumptions per chunk. Prefer fewer, sharper items.
