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
- hermes/audit.log — append-only audit produced by the runner (ctx.log/ctx.alert/ctx.escalate)
- data/drafts.log — append-only record of drafts & gate decisions
- data/crm-inbox/ — webhook receiver stores all inbound CRM posts (audit)

Triggering and running once
- Run once: `node hermes/index.js --once` (will run all agents and exit)
- Tests: `npm test` or `node hermes/test.js`

Debugging tips
- If an agent logs an error, hermes/index.js records it in hermes/audit.log and continues. Use the audit log to find repeated failures.
- For Anthropic-related failures, check ANTHROPIC_API_KEY in .env — if unset the system runs deterministic local fallbacks (no paid API calls).

Talking to Hermes (operator flows)
- Ingest a lead: drop a JSON file into data/leads-inbox/ with fields {name,contact,message,ts}
- Ingest a torque log: drop a JSON into data/torque-logs/ with the 12 required PE fields
- Approve a social draft: use n8n Telegram workflow to Approve/Reject; approval posts back to Hermes endpoint configured in the workflow

