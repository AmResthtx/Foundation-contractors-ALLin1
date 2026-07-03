'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

// Approval callback receiver (Policy 5: all auto-sends auditable and
// traceable). n8n's approval workflow POSTs the human's approve/reject
// decision here so Hermes can record it — and, on publish, the published
// URL — in the audit log. Listens only inside the compose network
// (http://hermes:8787); do NOT publish this port in docker-compose.
//
// POST /callback/approval  {audit_id, approved, platform?, published_url?, approver?}
// GET  /health             liveness probe

const MAX_BODY_BYTES = 64 * 1024;

function startCallbackServer(ctx, port) {
  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      return res.end('ok');
    }
    if (req.method !== 'POST' || req.url !== '/callback/approval') {
      res.writeHead(404, { 'content-type': 'text/plain' });
      return res.end('not found');
    }
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY_BYTES) req.destroy();
    });
    req.on('end', () => {
      let obj;
      try {
        obj = JSON.parse(body);
      } catch (_e) {
        res.writeHead(400, { 'content-type': 'text/plain' });
        return res.end('invalid json');
      }
      if (!obj || typeof obj.audit_id !== 'string' || !obj.audit_id || typeof obj.approved !== 'boolean') {
        res.writeHead(400, { 'content-type': 'text/plain' });
        return res.end('audit_id (string) and approved (boolean) are required');
      }
      const record = {
        audit_id: obj.audit_id,
        approved: obj.approved,
        platform: obj.platform || null,
        published_url: obj.published_url || null,
        approver: obj.approver || 'unknown',
        ts: new Date().toISOString(),
      };
      try {
        const dir = path.join(ctx.dataDir, 'approvals');
        fs.mkdirSync(dir, { recursive: true });
        const safeName = obj.audit_id.replace(/[^A-Za-z0-9_.-]/g, '_');
        fs.writeFileSync(path.join(dir, `${safeName}.json`), JSON.stringify(record, null, 2), 'utf8');
      } catch (e) {
        ctx.log({ agent: 'approval-callback', error: `failed to persist approval: ${String(e)}` });
        res.writeHead(500, { 'content-type': 'text/plain' });
        return res.end('failed to persist');
      }
      ctx.log({
        agent: 'approval-callback',
        action: obj.approved ? 'draft_approved' : 'draft_rejected',
        audit_id: obj.audit_id,
        platform: record.platform,
        published_url: record.published_url,
        approver: record.approver,
      });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
  });

  // A dead callback server must not take down the monitoring loops — log
  // loudly and keep the daemon alive; approvals will queue in n8n's
  // execution history until the next restart.
  server.on('error', (e) => {
    ctx.log({ agent: 'approval-callback', error: `callback server error: ${String(e)}` });
  });

  server.listen(port, () => {
    ctx.log({ agent: 'approval-callback', message: `approval callback listening on :${port} (compose-internal)` });
  });
  return server;
}

module.exports = { startCallbackServer };
