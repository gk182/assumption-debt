---
name: task-generator
description: Generate, review, approve, and export actionable verification and review tasks from unverified assumptions and refuted cascades in the Assumption Debt graph.
---

# Task Generator Skill

## Purpose
Turns implicit risks in project documents into concrete, falsifiable engineering tasks. 
Enforces the human-in-the-loop principle: **the system proposes, the human reviews and decides**.

## When to Use
- When planning verification work before committing engineering resources to a sprint or milestone.
- Immediately after an assumption is refuted (cascade triggered) to generate actionable re-examination tasks for affected downstream decisions and tasks.
- When exporting high-risk items to issue trackers (GitHub Issues, Jira Cloud, Lark Task v2, Linear) as Markdown checklists or CSV.

## Core Rules
1. **Human Approval Gate**: Every task starts in `proposed` state. Only human review changes it to `approved` or `rejected`.
2. **Prioritization by Risk Score**: 
   - `high`: `riskScore >= 3.0` or critical architectural decision.
   - `medium`: `1.5 <= riskScore < 3.0` or implementation task.
   - `low`: `riskScore < 1.5`.
3. **Traceability**: Every task carries a mandatory `targetNodeId` linking back to the exact graph node (Assumption, Decision, or Task) and verbatim quotes.
4. **Actionability**: Each task must feature 2-3 concrete, falsifiable steps (e.g. "Run user interview with 5 merchants", "Check P99 latency on mock load test").

## Functions Reference (`src/lib/tasks.ts`)
- `generateVerificationTasks(nodes, edges, topN, baseDate)`: Pure function returning top `topN` verification tasks ordered by descending `riskScore`.
- `generateReviewTasks(refutedId, nodes, edges, baseDate)`: Pure function generating review tasks for all downstream nodes when an assumption is refuted.
- `exportTasksToMarkdown(tasks, projectName)`: Generates ready-to-paste GitHub/Notion flavored Markdown checklists.
- `exportTasksToCSV(tasks)`: Generates RFC-4180 CSV for spreadsheet and issue tracker import.
