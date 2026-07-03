# RUNBOOK — Hermes jobs & talking to Hermes

This runbook shows the key Hermes jobs, where to look for inputs and outputs, and how to trigger or debug jobs.

Jobs
- email-intel (hermes/agents/email-intel.js)
  - Watches: data/leads-inbox/
  - Success: data/leads-processed/ contains JSON {name,contact,message,ts}
  - Failure: data/leads-error/ contains malformed or invalid payloads

- lead-scorer (hermes/agents/lead-scorer.js)
  - Watches: data/leads-processed/
  - Outputs: data/leads-scored/ with score and reasoning; data/leads-reminders/ for HOT leads

- torque-verifier (hermes/agents/torque-verifier.js)
  - Watches: data/torque-logs/
  - Outputs: verified => data/torque-logs/verified/, rejected => data/torque-logs/rejected/

- content-pipeline (hermes/agents/content-pipeline.js)
  - Triggers: new verified torque logs or new scored leads
  - Outputs: appends to data/drafts.log and POSTs `{type:"social_draft", platform, text, sources, audit_id}` to CRM_WEBHOOK_URL

- autonomous-optimization-architect (hermes/agents/autonomous-optimization-architect.js)
  - Runs periodic low-cost analysis and recommends small ops changes via audit log entries

Where to find logs & audit trail
- data/audit.log — append-only audit produced by the runner (ctx.log/ctx.alert/ctx.escalate)
- data/drafts.log — append-only record of drafts & gate decisions
- data/crm-inbox/ — webhook receiver stores all inbound CRM posts (audit)

Triggering and running once
- Run once: `node hermes/index.js --once` (will run all agents and exit)
- Tests: `npm test` or `node hermes/test.js`

Debugging tips
- If an agent logs an error, hermes/index.js records it in data/audit.log and continues. Use the audit log to find repeated failures.
- For Anthropic-related failures, check ANTHROPIC_API_KEY in .env — if unset the system runs deterministic local fallbacks (no paid API calls).

Talking to Hermes (operator flows)

Two channels now, both write every command + response to data/audit.log — talking to
Hermes is an audited action like anything an agent does, not a side channel.

**1. CLI (`hermes/chat.js`)** — works today, no setup beyond a running container:
```bash
docker compose exec hermes node hermes/chat.js status         # every agent: interval, last run, last error
docker compose exec hermes node hermes/chat.js run steel-ppi   # trigger one agent immediately
docker compose exec hermes node hermes/chat.js ask "what alloy do we use for pile shafts?"  # KB-grounded Q&A (needs ANTHROPIC_API_KEY)
docker compose exec hermes node hermes/chat.js lead "Jane Doe" "555-1234" "slab is sagging"  # drop a lead into intake
docker compose exec hermes node hermes/chat.js torque-status   # pending/verified/rejected counts
docker compose exec hermes node hermes/chat.js                 # interactive REPL, same commands without the prefix
```
`ask` answers strictly from `hermes/research/*.md` — it will say "the KB doesn't cover
that" rather than guess, and cites SRC-###/PRJ-### where it draws on a fact.

**2. File-drop (no CLI needed)**
- Ingest a lead: drop a JSON file into data/leads-inbox/ with fields {name,contact,message,ts}
- Ingest a torque log: drop a JSON into data/torque-logs/ with the 12 required PE fields
- Approve a social draft: use n8n Telegram workflow to Approve/Reject; approval posts back to Hermes endpoint configured in the workflow

**Not yet built**: Telegram two-way (message the bot, Hermes replies in-chat via n8n
forwarding to the same command handler `chat.js` uses). The CLI proves the command
handler works; wiring it into the existing Telegram alert workflow is the natural next
step whenever that's wanted.

