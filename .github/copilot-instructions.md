# Copilot Instructions — Foundation-contractors-ALLin1

These instructions govern all Copilot work in this repository **until the Hermes agent
stack is up and running**. Read `POLICIES.md` and `hermes/config/_policies.md` before
making any change — they are binding, not advisory.

## What this repo is

Workflow automation for a helical-pier foundation contracting company serving
Spring, TX / Harris County. The centerpiece is **Hermes**, a multi-agent orchestrator
(not yet built) that will handle research, content publishing, industry monitoring,
lead scoring, and CRM workflows. Current state: policies + initial research only.

## Layout

| Path | Purpose |
|---|---|
| `POLICIES.md` | Company content & publishing policies (public-facing rules) |
| `hermes/config/_policies.md` | Hermes system policies (agent charter, 8 policies) |
| `hermes/research/` | Living research files: sources, alloy codes, local monitoring, backlog |
| `docs/AGENT_STACK.md` | Agent stack architecture and build order — follow this when implementing |
| `.env.example` | Required environment variables (never commit a real `.env`) |

## Hard rules (from the policies — do not relax these)

1. **Sources**: only authoritative origins (ICC-ES, ASCE, AISC, DFI, USGS, BLS/FRED,
   Harris County Engineering, TWDB, manufacturer technical docs). Never cite content
   farms, unverified blogs, competitor marketing, or unreviewed LLM output.
2. **Stress-test before publish**: no content pipeline may push to production without
   source validation, contradiction checks, local code compliance verification, and an
   audit log entry. Build these gates in from the start; do not stub them as no-ops.
3. **Transparency**: agents must never claim to be human when asked directly. Anything
   requiring authenticity escalates to Ellis (`CRM_EMAIL` in env).
4. **Payment blocking**: final-payment logic requires real torque logs on file — never
   fabricated prices or assumed installation depths.
5. **Secrets**: keys live in `.env` only. Never hardcode keys, never commit `.env`,
   never print secrets to logs.
6. **Traceability**: public content cites sources visibly; internal files carry trace
   IDs (`SRC-###` in `hermes/research/sources.md`). Keep both when generating content.

## Conventions

- Node.js project (see `.env.example`: `NODE_ENV`, `LOG_LEVEL`, `DB_PATH`). Prefer
  plain Node + minimal dependencies; every dependency is an audit surface.
- Research files in `hermes/research/` are **living documents**: append with dates,
  don't silently rewrite history. Each factual claim gets a source link + trace ID.
- Agent charters go in `hermes/config/`, one file per agent, following the pattern of
  `_policies.md`.
- Commit messages: imperative mood, one logical change per commit.
- All PRs target `main`; develop on feature branches.

## Build order (see `docs/AGENT_STACK.md` for detail)

1. Research/knowledge-base agent (sources registry + validation gate) — **started**,
   continue from `hermes/research/backlog.md`.
2. Industry monitor (steel PPI indices, HGSD/subsidence feeds, permit changes).
3. Content pipeline with the Policy 2 stress-test gate.
4. Lead scoring + CRM webhook (`CRM_WEBHOOK_URL`, Web3Forms).
5. Fidelity auditor (Policy 4: grade agents on adherence, not outcomes).

When in doubt about scope or a policy conflict, stop and open an issue instead of
guessing — Policy 4 grades adherence, not cleverness.
