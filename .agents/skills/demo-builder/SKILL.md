---
name: demo-builder
description: Prepare and rehearse the 2-minute Assumption Debt demo - seed data, one-click reset, the scripted flow (paste PRD, extract, review, graph, refute, cascade), fallbacks when the API is down, and the pitch narrative. Use whenever the task mentions demo, pitch, presentation, hackathon, screen recording, seed or reset data, or "make it ready to show".
---

# Demo Builder

## The 2-minute script
1. (0:00) Problem, one sentence: "Every decision stands on beliefs nobody wrote down."
2. (0:15) Paste `data/demo/prd-food-delivery.md` -> click Extract.
3. (0:35) Review inbox: confirm 4-5 cards fast with the keyboard. Pause on one the audience did not think of.
4. (0:55) Graph appears. Point at the Debt panel: "Biggest debt: shipping fee assumption, 6 weeks of work depends on it."
5. (1:15) **Refute A1** with note "survey: 38% abandon cart at 15k". Cascade animates.
6. (1:40) Panel: "3 items need review, 6 weeks at risk." End line: "Technical debt you can see. Assumption debt you couldn't, until now."

## Must-haves
- `npm run seed` loads `data/demo/seed.json`; `npm run reset` restores it. Demo must work with no network.
- **Offline fallback**: if the extract call fails or `DEMO_MODE=1`, return a cached result from `data/demo/extraction-cached.json` (generate it once with the real API and commit it).
- Fixed window size 1440x900 for recording; hide dev overlays.
- One real (anonymized) document ready as a Plan B for "can it handle my doc?" questions.

## Rehearsal checklist
- [ ] Full run 3 times under 2:00
- [ ] Refresh mid-demo restores state
- [ ] Reduced-motion fallback verified
- [ ] 30s screen recording saved as backup
