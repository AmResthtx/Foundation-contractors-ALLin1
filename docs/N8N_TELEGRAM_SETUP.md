# n8n + Telegram Setup

Gets every Hermes alert and escalation into a Telegram chat on your phone, and lays
the rails for the social-media approval flow (`docs/AGENT_STACK.md` §Content Pipeline).
One-time setup, ~15 minutes. Steps marked **[you]** need a human; the rest is done.

## 1. Start n8n (done in docker-compose)

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
   it goes into n8n's credential store in step 4, nowhere else.
3. **Send your new bot any message** (e.g. "hi") — a bot can't message you first.
4. Get your **chat ID**: open
   `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
   in a browser and read `"chat":{"id": 123456789, ...}` from the JSON.

## 3. Import the notification workflow

In the n8n UI: **Workflows → ⋯ → Import from File** →
`hermes/n8n/hermes-telegram-notify.json` from this repo.

It's two nodes: a Webhook (path `hermes-inbox`) → Telegram sendMessage. Escalations
get a 🚨 prefix, regular alerts 🔔.

## 4. Wire credentials and chat ID **[you]**

1. Open the **Send to Telegram** node → Credential dropdown → **Create new** →
   paste the bot token from step 2.
2. Replace `REPLACE_WITH_YOUR_CHAT_ID` in the node's *Chat ID* field with your
   chat ID from step 2.4.
3. **Save**, then toggle the workflow **Active** (top right). The production
   webhook is now live at `http://n8n:5678/webhook/hermes-inbox` (inside the
   compose network).

## 5. Point Hermes at it

In `.env`:

```
CRM_WEBHOOK_URL=http://n8n:5678/webhook/hermes-inbox
```

Then `docker compose up -d` (recreates hermes with the new env).

## 6. Test end to end

```powershell
docker compose exec hermes node -e "fetch(process.env.CRM_WEBHOOK_URL,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({source:'hermes',agent:'test',msg:'Telegram hookup works',ts:new Date().toISOString()})}).then(r=>console.log('webhook HTTP',r.status))"
```

Expected: `webhook HTTP 200` in the terminal and a 🔔 message in Telegram within a
second or two. From now on, feed-watch hits, PPI moves, and escalations all land in
that chat.

## Troubleshooting

- **HTTP 404 from the webhook** → workflow isn't Active (a test-mode webhook only
  lives while you're clicking "Listen" in the editor; flip the Active toggle).
- **200 but no Telegram message** → wrong chat ID, or you never messaged the bot
  first (step 2.3). Check the workflow's execution list in the n8n UI for the error.
- **n8n unreachable from hermes** → both containers must be up via the same
  `docker compose up -d` (shared network); the URL uses the service name `n8n`,
  not `localhost`.

## Next (when the content pipeline lands)

The same rails carry social drafts: Hermes will POST `type: "social_draft"` payloads
to this webhook; the workflow grows an approval branch using n8n's Telegram
**Send and Wait for Response / Approval** operation (Approve/Reject buttons in your
chat), and only approved drafts continue to the social posting nodes — Policy 5's
"you approve" rule, enforced by wiring. Social accounts (Meta/LinkedIn/X) get
connected as n8n credentials at that point too (backlog R-14).
