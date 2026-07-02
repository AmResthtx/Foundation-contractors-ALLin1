# Hermes Agent Stack — Architecture & Build Order

Status: **design + research phase** (nothing running yet). This document is the interim
source of truth for anyone (human or Copilot) implementing the stack. Governing rules:
`POLICIES.md` and `hermes/config/_policies.md`.

## Goal

A small orchestrated set of agents that automate the company's research, monitoring,
content, and lead workflows for the helical pier business in Spring, TX / Harris County —
with every output traceable to authoritative sources and gated before publication.

## Agents

### 1. Researcher / Knowledge Base (build first — research already started)
- Maintains `hermes/research/` as the canonical knowledge base:
  `sources.md` (registry with `SRC-###` trace IDs), `steel-alloys.md`,
  `local-monitoring.md`, `backlog.md`.
- Validates every new fact against the allowed-source list (Policy 1) before it enters
  the KB. Rejected items are logged, not silently dropped.
- Storage: flat markdown now; move to `DB_PATH` (SQLite/JSON) when the orchestrator lands.

### 2. Industry Monitor
- **Steel prices**: pull BLS PPI series via FRED API monthly — `WPU101704`
  (hot-rolled bars/plates/structural shapes) and `WPU101706` family (steel pipe & tube).
  Flag month-over-month moves beyond a configurable threshold.
- **Local**: Harris-Galveston Subsidence District announcements, Harris County
  Engineering permitting changes, USGS Houston subsidence data, notable local
  foundation/subsidence incidents (timely-content triggers per POLICIES.md Policy 3).
- Output: dated entries appended to `hermes/research/local-monitoring.md` + alerts to
  `CRM_EMAIL` on material change.

### 3. Content Pipeline
- Drafts educational content (blog, case studies, social) from the KB only.
- **Policy 2 gate is mandatory and blocking**: source validation → contradiction
  stress-test (`KB_STRESS_TEST_MODE`) → local-code compliance check → peer/engineer
  review flag for structural claims → audit log entry. No gate, no publish.
- Dual citation: visible public attribution + internal `SRC-###` trace ID.

### 4. Lead Scorer / CRM
- Scores inbound leads on urgency signals; hot leads (immediate structural risk)
  dispatch within 24h (Policy 7). Every score logged with reasoning.
- Integrations: Web3Forms (`WEB3FORMS_KEY`) for intake, `CRM_WEBHOOK_URL` (n8n)
  for routing, `CRM_EMAIL` for escalation.

### 5. Fidelity Auditor
- Grades each agent on **policy adherence, not outcomes** (Policy 4: rule-following
  flop = PASS, rule-breaking viral hit = FAIL).
- 3-cycle repeat offenders escalate to Ellis.

## Orchestration

- Single Node.js process to start; agents as modules with a shared audit log and the
  source registry as shared state. Anthropic API (`ANTHROPIC_API_KEY`) for reasoning.
- Escalation path is always the same: uncertain / authenticity-required / policy
  conflict → Ellis via `CRM_EMAIL`. Agents never claim to be human (Policy 5).

## Build order & current status

| # | Component | Status |
|---|---|---|
| 1 | Research KB + source registry | ✅ seeded (`hermes/research/`) — continue via backlog |
| 2 | Industry monitor (FRED/PPI + local feeds) | not started — series IDs identified |
| 3 | Content pipeline + Policy 2 gate | not started |
| 4 | Lead scorer + CRM webhook | not started |
| 5 | Fidelity auditor | not started |
| 6 | Orchestrator wiring | not started |
