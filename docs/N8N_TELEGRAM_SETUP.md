# n8n Telegram setup and Hermes Social Approval import

This doc shows how to import the Hermes Social Approval workflow into n8n and configure the Telegram node.

1. Start n8n and open the UI.
2. Import `hermes/n8n/hermes-social-approval.json` (Workflows → Import).
3. Configure the Webhook node to accept incoming POSTs.
4. Configure the Telegram Send-and-Wait node:
   - Add a new Telegram credential or bot token
   - Set Chat ID to the value in your Hermes .env (TELEGRAM_CHAT_ID)
   - Set the message template to include the draft text and an Approve/Reject keyboard
5. Configure the HTTP callback node for the approve branch to POST `{audit_id, approved:true}` to your Hermes endpoint (set in the workflow node configuration)

Notes
- The workflow JSON includes a placeholder CHAT ID: `REPLACE_WITH_YOUR_CHAT_ID`. Replace this with `8869749363` or your actual group/chat id.
- The webhook expects a JSON payload: `{type:"social_draft", platform, text, sources:[SRC-###], audit_id}`.
