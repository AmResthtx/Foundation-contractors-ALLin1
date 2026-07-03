# n8n + Telegram Setup

Gets every Hermes alert and escalation into a Telegram chat on your phone, and — with
the unified workflow — puts an **Approve/Reject gate** on every social draft (Policy 5:
nothing posts without your approval). One-time setup, ~15 minutes. Steps marked
**[you]** need a human; the rest is done.

## 1. Start the stack (done in docker-compose)

```powershell
git pull
docker compose up -d
```

n8n's UI is now at http://localhost:5678 (bound to this machine only — don't expose
it to the internet without adding auth/TLS). First visit asks you to create the owner
account. Workflows and encrypted credentials persist in `./n8n-data/`.

## 2. Create the Telegram bot **[you]**

1. In Telegram, message **@BotFather** → send `/newbot` → pick a name (e.g.
   "Hermes Alerts") and a username ending in `bot`.
2. BotFather replies with a **bot token** (`123456:ABC-...`). Keep it private —
   it goes into n8n's credential store in step 4, nowhere else. Never commit it.
3. **Send your new bot any message** (e.g. "hi") — a bot can't message you first.
4. Get your **chat ID**: open
   `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
   in a browser and read `"chat":{"id": 123456789, ...}` from the JSON.

## 3. Import the unified workflow

In the n8n UI: **Workflows → ⋯ → Import from File** →
`hermes/n8n/hermes-social-approval.json` from this repo.

One webhook (path `hermes-inbox`), two branches:
- **Alerts/escalations** (anything that isn't a draft) → Telegram message
  (🚨 prefix for escalations, 🔔 for the rest).
- **`type: "social_draft"`** → Telegram **Send and Wait for Approval**
  (✅ Approve / 🚫 Reject buttons) → the decision is POSTed back to Hermes at
  `http://hermes:8787/callback/approval` and recorded in the audit log
  (`data/approvals/<audit_id>.json`). Social posting nodes attach after the
  approve branch when the accounts are connected (backlog R-14).

> The older `hermes/n8n/hermes-telegram-notify.json` (alerts only) is superseded by
> this workflow. If you imported it earlier, **deactivate it before activating this
> one** — two active workflows can't share the `hermes-inbox` webhook path.

## 4. Wire credentials and chat ID **[you]**

1. Open any Telegram node → Credential dropdown → **Create new** →
   paste the bot token from step 2. All Telegram nodes share this one credential.
2. Replace `REPLACE_WITH_YOUR_CHAT_ID` with your chat ID from step 2.4 in **every
   Telegram node** (there are five: the approval node, two confirms, the notify node —
   use the n8n search or click each).
3. **Save**, then toggle the workflow **Active** (top right). The production
   webhook is now live at `http://n8n:5678/webhook/hermes-inbox` (inside the
   compose network).

## 5. Point Hermes at it

In `.env`:

```
CRM_WEBHOOK_URL=http://n8n:5678/webhook/hermes-inbox
CALLBACK_PORT=8787
```

Then `docker compose up -d` (recreates hermes with the new env).

## 6. Test end to end

**Alert path** — expect `webhook HTTP 200` and a 🔔 message in Telegram:

```powershell
docker compose exec hermes node -e "fetch(process.env.CRM_WEBHOOK_URL,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({source:'hermes',agent:'test',msg:'Telegram hookup works',ts:new Date().toISOString()})}).then(r=>console.log('webhook HTTP',r.status))"
```

**Approval path** — expect a 📝 draft message with Approve/Reject buttons; tap one,
then check the decision landed in Hermes:

```powershell
docker compose exec hermes node -e "fetch(process.env.CRM_WEBHOOK_URL,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'social_draft',platform:'facebook',text:'TEST DRAFT — helical piers transfer load to stable strata (SRC-001).',sources:['SRC-001'],audit_id:'AUD-manual-test-1'})}).then(r=>console.log('webhook HTTP',r.status))"
docker compose exec hermes cat /app/data/approvals/AUD-manual-test-1.json
```

From now on, feed-watch hits, PPI moves, escalations, and draft approvals all live in
that one chat.

## Troubleshooting

- **HTTP 404 from the webhook** → workflow isn't Active (a test-mode webhook only
  lives while you're clicking "Listen" in the editor; flip the Active toggle). Or the
  old notify workflow is still active and owns the path — deactivate it.
- **200 but no Telegram message** → wrong chat ID, or you never messaged the bot
  first (step 2.3). Check the workflow's execution list in the n8n UI for the error.
- **Buttons tapped but no approval file in Hermes** → check the workflow execution:
  if the HTTP Request node failed, hermes isn't reachable — both containers must be
  up via the same `docker compose up -d`, and `CALLBACK_PORT` must not be 0. The URL
  uses the service name `hermes`, not `localhost`.
- **n8n unreachable from hermes** → same compose network requirement; the webhook URL
  uses the service name `n8n`, not `localhost`.
- **Send-and-Wait node errors on import** → n8n versions vary in this node's exact
  parameters; open the node and re-pick "Send and Wait for Approval" with two buttons
  (Approve/Reject) — everything downstream reads `$json.data.approved`.

## Next (when the social accounts connect — backlog R-14)

Connect Facebook/Instagram (Meta), LinkedIn, X, and Google Business Profile as n8n
credentials, then attach their posting nodes after **Confirm Approved**. Include the
post URL in a second callback POST so Hermes records where each approved draft was
published (Policy 5: all auto-sends traceable).
