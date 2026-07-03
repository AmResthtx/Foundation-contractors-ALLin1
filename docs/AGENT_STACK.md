# Hermes Agent Stack — Architecture & Build Order

Status: **running** (all agents load and execute; see build-order table below for what's
real vs. still a stub). Governing rules: `POLICIES.md` and `hermes/config/_policies.md`.
Runtime docs: `docs/RUNBOOK.md` (jobs, logs, and how to talk to Hermes via `hermes/chat.js`).

## Goal

A small orchestrated set of agents that automate the company's research, monitoring,
content, and lead workflows for the helical pier business in Spring, TX / Harris County —
with every output traceable to authoritative sources and gated before publication.

## Agents

### 1. Researcher / Knowledge Base
- Maintains `hermes/research/` as the canonical knowledge base:
  `sources.md` (registry with `SRC-###`/`PRJ-###` trace IDs), `steel-alloys.md`,
  `local-monitoring.md`, `statewide-monitoring.md`, `helical-pier-project-examples.md`,
  `backlog.md`.
- `hermes/agents/automation-governance.js` validates every citation in a content-pipeline
  draft against `sources.md` before it can pass the Policy 2 gate; unknown or
  internal-only (`PRJ-###`) IDs block the draft, not silently drop it.
- Storage: flat markdown for now; `DB_PATH` (bind-mounted `./data`) holds runtime state.

### 2. Industry Monitor
- **Steel prices** (`hermes/agents/steel-ppi.js`): FRED `WPU101704` (hot-rolled
  bars/plates/structural shapes) and `PCU33123312` (steel product mfg from purchased
  steel), daily, alerts on month-over-month move ≥ `PPI_ALERT_PCT`.
- **TMOS** (`hermes/agents/tmos.js`, backlog R-11): Dallas Fed Texas Manufacturing
  Outlook Survey headline index (`BACTSAMFRBDAL`) — diffusion-index alerting (sign flip
  or point move ≥ `TMOS_ALERT_POINTS`), not percent change.
- **Local events** (`hermes/agents/local-monitoring.js`): HGSD + Houston Public Media
  RSS, alerts on sinkhole/subsidence/foundation-distress keywords.
- **Statewide events** (`hermes/agents/statewide-monitoring.js`): Texas Tribune +
  Texas Register RSS, narrower keyword set (high-volume feeds need less noise).
- All four alert via `ctx.alert()` → `CRM_WEBHOOK_URL` (n8n → Telegram).

### 3. Content Pipeline (`hermes/agents/content-pipeline.js`)
- Drafts educational content from the KB only, triggered by new verified torque logs or
  newly-scored leads.
- **Policy 2 gate is mandatory and blocking**: source validation (`automation-governance.js`)
  → contradiction stress-test (`reality-checker.js`, active when `KB_STRESS_TEST_MODE=true`)
  → structural-claim flag (`civil-engineer.js` keyword check → `engineer_review_required`)
  → audit log entry with a generated `audit_id`. Any gate failure blocks the draft in
  `data/drafts.log`; nothing skips the gate.
- Dual citation: visible public attribution + internal `SRC-###`/`PRJ-###` trace ID.
- Drafting itself calls Anthropic via `hermes/lib/anthropic.js` when `ANTHROPIC_API_KEY`
  is set; falls back to a placeholder draft (still gated) when it isn't.

**Social media connection** — Hermes never holds social credentials. The design:
1. Social profiles (Facebook/Instagram via Meta, LinkedIn, X, Google Business
   Profile) connect to **n8n** using its built-in social nodes; OAuth tokens live in
   n8n's credential store, not in this repo or `.env`.
2. Hermes POSTs drafts to `CRM_WEBHOOK_URL` as JSON
   (`{type: "social_draft", platform, text, sources: ["SRC-###"], audit_id}`).
3. n8n runs an **approval step first** (email/telegram to Ellis with
   approve/reject) — Policy 5: the responder drafts in Ellis's voice, Ellis
   approves; nothing auto-publishes without a standing, auditable rule.
4. On approval, n8n posts to the platform and calls back so Hermes records the
   published URL in the audit log (Policy 5: all auto-sends traceable).

Status: the webhook contract, gate, approval workflow, and callback are all built:
`hermes/n8n/hermes-social-approval.json` (unified: alert branch + draft-approval branch
with Telegram Approve/Reject) supersedes the notify-only workflow, and the daemon runs
an approval callback receiver (`hermes/lib/callback-server.js`, `http://hermes:8787`,
compose-internal) that records every decision in `data/approvals/` + the audit log.
Remaining human steps: import + credential wiring in the n8n UI
(docs/N8N_TELEGRAM_SETUP.md) and, later, connecting the actual social accounts and
posting nodes (backlog R-14) — either n8n's native per-platform nodes or a
self-hosted Postiz instance as the single posting API (option recorded in R-14).

### 4. Lead Scorer / CRM
- `hermes/agents/email-intel.js` watches `data/leads-inbox/`, validates shape, quarantines
  malformed/invalid payloads to `data/leads-error/` without crashing, moves good leads to
  `data/leads-processed/`.
- `hermes/agents/lead-scorer.js` scores 0-100 via Anthropic (rubric in
  `hermes/research/prompts/index.js`) with a rule-based keyword fallback when no key is
  set. Score ≥70 = HOT → immediate `ctx.alert()` + a 24h-dispatch reminder file in
  `data/leads-reminders/` (Policy 7). Every score logged with its reasoning.
- Integrations: `CRM_WEBHOOK_URL` (n8n) for alert routing, `CRM_EMAIL`/`WEB3FORMS_KEY` for
  escalation fallback.

### 5. Fidelity Auditor (`hermes/agents/fidelity-auditor.js`)
- Grades every other agent on **policy adherence, not outcomes** (Policy 4: a campaign
  that flops while following the rules is a PASS; breaking a rule to go viral is a FAIL)
  — weekly, against real evidence in `data/audit.log`, never against mere silence (a
  quiet week is untested, not failing).
- Five rules today, one per checkable Policy/agent pair: lead-scorer reasoning +
  hot-lead dispatch (Policy 7), torque-verifier rejection reasons (Policy 6),
  content-pipeline gate completeness (Policy 2), escalation transparency (Policy 5).
  Extend `RULES` in the agent file as new agents ship real, checkable log output —
  never add a rule that has to guess intent.
- Tracks a consecutive-fail streak per rule in `data/fidelity-history.json`;
  **3-cycle repeat offenders escalate to Ellis** via `ctx.escalate()`.
- Dated pass/fail report appended to `data/audit-reports.md` every cycle (runtime
  output, not a committed research doc).
- `hermes/agents/autonomous-optimization-architect.js` remains a separate, narrower
  agent — ops-cost recommendations from alert/error volume, not policy grading.

### Torque-log verification (Policy 6 / backlog R-9)
- `hermes/agents/torque-verifier.js` + `hermes/agents/civil-engineer.js` (field
  definitions, from the Ward-French Residence PE spec — see
  `hermes/research/helical-pier-project-examples.md`, PRJ-002): validates all 12 required
  PE inspection fields are present and numerically sane before moving a torque log to
  `data/torque-logs/verified/` (payment clearance) or `data/torque-logs/rejected/` with
  every failing field named. Never auto-fills or estimates a missing value.

### Orchestration / task routing
- `hermes/agents/agents-orchestrator.js`: lightweight router — reads
  `data/orchestrator-todo/` and dispatches typed work items (currently: `lead` →
  `data/leads-inbox/`) to the right agent's intake folder.
- `hermes/agents/bookkeeper.js`: append-only ledger scaffold (`data/bookkeeper/ledger.jsonl`)
  — no external connections, ready for real bookkeeping logic to be layered on.
- `hermes/agents/prompt-engineer.js`: loads/serves the shared prompt templates other
  agents pull from (`hermes/research/prompts/index.js`).

## Orchestration runtime

- Single Node.js process (`hermes/index.js`); each agent module runs on its own
  `intervalMs` with a shared `ctx` (`log`/`alert`/`escalate`/`dataDir`) and audit log.
  Crash-only design: a failing job logs and retries on its own interval — it never exits
  the process. A **watchdog** (`staleAfterMs` per agent) exits the process only for
  genuine hangs, so the Docker restart policy can recover it.
- Communication: `hermes/chat.js` — CLI + REPL for status/run/ask/lead/torque-status,
  the two-way command channel described in `docs/RUNBOOK.md`.
- Escalation path is always the same: uncertain / authenticity-required / policy
  conflict → Ellis via `CRM_EMAIL` + Web3Forms email + the Telegram alert webhook.
  Agents never claim to be human (Policy 5).
- Anthropic API (`ANTHROPIC_API_KEY`) for reasoning, via the shared
  `hermes/lib/anthropic.js` helper — every caller degrades to a logged fallback when the
  key is unset rather than failing the whole run.

## Build order & current status

| # | Component | Status |
|---|---|---|
| 1 | Research KB + source registry | ✅ seeded, restored after a regression (`hermes/research/`) — continue via backlog |
| 2 | Industry monitor (FRED PPI + TMOS + local/statewide feeds) | ✅ all four agents running; feed URLs verified in prod, not yet re-verified since the restructure |
| 3 | Content pipeline + Policy 2 gate | ✅ real enforcement (source validation, contradiction stress-test, structural-claim flag, audit entry) — no publish path wired past the CRM webhook yet (needs n8n approval branch) |
| 4 | Lead scorer + CRM webhook + torque-log verifier | ✅ running end to end (file-drop → email-intel → lead-scorer → HOT alert / torque-verifier → payment clearance) |
| 5 | Fidelity auditor | ✅ weekly policy-adherence grading (5 rules) + 3-cycle escalation running |
| 6 | Orchestrator wiring | ✅ per-agent interval scheduling, watchdog, `--once` mode for GitHub Actions fallback, `hermes/chat.js` two-way CLI |
| 7 | n8n Telegram approval + social posting | 🚧 approval workflow + Hermes callback receiver shipped (`hermes-social-approval.json`, `callback-server.js`); needs human import/credentials in n8n UI; platform posting nodes still open (backlog R-14) |

## agency-agents mapping

Where each agent's role traces back to the agency-agents roster (per the build prompt
used to seed this stack):

| agency-agents name | hermes module | assigned task |
|---|---|---|
| Prompt Engineer | `hermes/agents/prompt-engineer.js` | prompt template management |
| Bookkeeper & Controller (light) | `hermes/agents/bookkeeper.js` | lightweight ledger |
| Autonomous Optimization Architect | `hermes/agents/autonomous-optimization-architect.js` | low-cost operational recommendations |
| Email Intelligence Engineer | `hermes/agents/email-intel.js` | ingest leads, quarantine malformed input |
| Lead Scorer | `hermes/agents/lead-scorer.js` | score leads 0-100, HOT alerts, reminders |
| Civil Engineer | `hermes/agents/civil-engineer.js` | structural claim detection, PE field model |
| Torque Verifier | `hermes/agents/torque-verifier.js` | validate 12-field PE records, verify/reject |
| Automation Governance Architect | `hermes/agents/automation-governance.js` | Policy 2 gate helpers, audit IDs |
| Reality Checker | `hermes/agents/reality-checker.js` | contradiction stress-test |
| Content Pipeline | `hermes/agents/content-pipeline.js` | draft creation + gating + CRM post |
| Agents Orchestrator | `hermes/agents/agents-orchestrator.js` | task routing & handoffs |
| *(none — restored, not from agency-agents)* | `hermes/agents/heartbeat.js`, `steel-ppi.js`, `tmos.js`, `local-monitoring.js`, `statewide-monitoring.js` | Industry Monitor (component 2) |
| *(none — built to close the Fidelity Auditor gap)* | `hermes/agents/fidelity-auditor.js` | Fidelity Auditor (component 5) |
