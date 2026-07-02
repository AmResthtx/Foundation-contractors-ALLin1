# Runbook — keeping the loops alive

How the Hermes loops run, what restarts them, and where to look when something breaks.

## The three layers of "keep it running"

1. **Inside the process** (`hermes/index.js`): each job runs on its own interval. A job
   that throws is logged and retried next interval; after 5 consecutive failures, or if
   the watchdog sees a job stalled past its staleness window, the process **exits
   non-zero on purpose**. Exiting is the recovery mechanism — never patch it to limp along.
2. **Docker restart policy** (`docker-compose.yml`, `restart: unless-stopped`): any
   non-zero exit relaunches the container, with backoff. Survives host reboots if the
   Docker daemon starts on boot (`systemctl enable docker`). The Dockerfile
   `HEALTHCHECK` only reports health in `docker ps` — the self-watchdog above is what
   actually triggers the restart.
3. **GitHub Actions fallback** (`.github/workflows/hermes-monitor.yml`): runs the same
   jobs in `--once` mode on a weekly schedule with no server at all. GitHub pauses
   schedules after ~60 days of repo inactivity; re-enable from the Actions tab or run it
   manually via *Run workflow*.

## Start / stop / restart (Docker)

```bash
cp .env.example .env          # fill in real values first
docker compose up -d --build  # start
docker compose logs -f hermes # watch structured JSON logs
docker ps                     # STATUS column shows (healthy)/(unhealthy)
docker compose restart hermes # manual restart
docker compose down           # stop (unless-stopped honors this; won't relaunch)
```

State and the audit log persist in `./data/` on the host (bind mount), so restarts and
rebuilds don't lose them: `data/audit.log` (every action, Policy 2), `data/heartbeat`,
`data/ppi-*.json` (last seen PPI observations).

## When something stops working

1. `docker compose logs --tail 100 hermes` — look for `"level":"error"` / `"fatal"`
   lines; they name the job and the reason.
2. `docker ps` says `Restarting` in a loop → the process is crashing at startup;
   the first `fatal` line in the logs is the cause (bad `.env` value, no network, etc.).
3. `(unhealthy)` but running → heartbeat stalled; the watchdog will exit and restart it
   within its staleness window. If it recurs, a job is hanging — check which job's
   `lastFinish` complaint appears in the fatal watchdog line.
4. A single job erroring but others fine → transient upstream failure (e.g. FRED down);
   it retries on the next interval and only kills the process after 5 straight failures.

## Current jobs

| Job | Interval | What it does |
|---|---|---|
| `heartbeat` | 60s | Touches `data/heartbeat` (feeds the health check) |
| `steel-ppi` | daily | Pulls FRED `WPU101704` / `PCU33123312`; logs new monthly observations; alerts `CRM_WEBHOOK_URL` when a move ≥ `PPI_ALERT_PCT` (default 5%) |
| `local-monitoring` | daily | Watches local RSS feeds (`LOCAL_FEEDS`, default HGSD + Community Impact Spring/Klein); logs new items, alerts on urgent keywords (sinkhole, subsidence, foundation, …). First sight of a feed seeds state silently — no alert storm on history. |

## Talking to Hermes

There is no chat interface yet — today communication is file- and webhook-based:

**Hermes → you**
- `data/audit.log` (or `docker compose logs -f hermes`): structured JSON, every action.
- Alerts: `"level":"alert"` entries are also POSTed to `CRM_WEBHOOK_URL` as JSON
  (`{source, agent, msg, ts}`). Point that at an n8n workflow to fan out to
  email/SMS/Slack — that's the intended "Hermes pings Ellis" channel.
- Escalations (`"level":"escalation"`): repeated job failures and watchdog
  restarts additionally send an email through Web3Forms when `WEB3FORMS_KEY`
  is set (recipient = the email tied to your Web3Forms account). This is the
  Policy 4 "repeat offenders escalate to Ellis" path.

**You → Hermes**
- `.env`: behavior knobs (e.g. `PPI_ALERT_PCT`); restart the container to apply.
- `hermes/research/backlog.md`: the task inbox — write research items there and
  agents (or Copilot) work them top-down.
- `hermes/config/`: agent charters; editing policies changes agent behavior.

A two-way command channel (reply-by-email or a small CLI, per the escalation design in
`docs/AGENT_STACK.md`) is a build item for the orchestrator-wiring phase.

## What is NOT durable

Anything scheduled inside a Claude Code chat session (PR check-ins, reminders) dies with
that session. If a loop matters, it belongs in this repo as code plus one of the two
runners above.
