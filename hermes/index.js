#!/usr/bin/env node
// Hermes orchestrator — job loop runner.
//
// Crash-only design: each agent module runs on its OWN intervalMs; a job that
// throws is logged and retried on its next interval — it does not exit the
// process (an upstream 404/outage can't be fixed by a restart, and treating
// every failure as fatal would crash-loop the container). The process exits
// non-zero only for genuine hangs (watchdog: an agent stopped finishing runs
// within its staleAfterMs) and unrecoverable startup errors.
//
// Modes:
//   node hermes/index.js          long-running daemon (Docker)
//   node hermes/index.js --once   run every agent once and exit (GitHub Actions)

'use strict';

const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.join(__dirname, 'agents');
const DATA_DIR = process.env.DB_PATH || path.join(process.cwd(), 'data');
const AUDIT_LOG = path.join(DATA_DIR, 'audit.log');
const HEARTBEAT_FILE = path.join(DATA_DIR, 'heartbeat');
const MAX_CONSECUTIVE_FAILURES = 5;

fs.mkdirSync(DATA_DIR, { recursive: true });

function appendAudit(obj) {
  try {
    const line = JSON.stringify(Object.assign({ ts: new Date().toISOString() }, obj)) + '\n';
    fs.appendFileSync(AUDIT_LOG, line, { encoding: 'utf8' });
  } catch (e) {
    console.error('failed to append audit log', e);
  }
}

// Escalation path (Policy 5): alerts go to the CRM webhook (n8n -> Telegram)
// when configured, and always to the audit log.
async function postWebhook(url, payload) {
  if (!url || !/^https?:\/\//.test(url)) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    appendAudit({ type: 'error', message: `webhook post failed: ${e.message}` });
  }
}

const ctx = {
  log: (entry) => {
    const payload = typeof entry === 'string' ? { message: entry } : entry || {};
    console.log('[LOG]', payload);
    appendAudit({ type: 'log', entry: payload });
  },
  alert: (entry) => {
    const payload = typeof entry === 'string' ? { message: entry } : entry || {};
    console.warn('[ALERT]', payload);
    appendAudit({ type: 'alert', entry: payload });
    postWebhook(process.env.CRM_WEBHOOK_URL, Object.assign({ source: 'hermes', ts: new Date().toISOString() }, payload));
  },
  escalate: (entry) => {
    const payload = typeof entry === 'string' ? { message: entry } : entry || {};
    console.error('[ESCALATE]', payload);
    appendAudit({ type: 'escalate', entry: payload });
    postWebhook(
      process.env.CRM_WEBHOOK_URL,
      Object.assign({ source: 'hermes', ts: new Date().toISOString() }, payload, {
        msg: `[ESCALATION] ${payload.message || JSON.stringify(payload)}`,
      })
    );
    const key = process.env.WEB3FORMS_KEY;
    if (key && key !== 'your_key') {
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          access_key: key,
          subject: `[Hermes escalation] ${payload.agent || 'orchestrator'}`,
          from_name: 'Hermes orchestrator',
          message: payload.message || JSON.stringify(payload),
        }),
      }).catch((e) => appendAudit({ type: 'error', message: `escalation email failed: ${e.message}` }));
    }
  },
  dataDir: DATA_DIR,
};

function loadAgents() {
  const agents = [];
  if (!fs.existsSync(AGENTS_DIR)) return agents;
  const files = fs.readdirSync(AGENTS_DIR).sort();
  for (const f of files) {
    if (!f.endsWith('.js')) continue;
    const full = path.join(AGENTS_DIR, f);
    try {
      const mod = require(full);
      if (mod && typeof mod.run === 'function' && typeof mod.name === 'string') {
        agents.push(mod);
      } else {
        ctx.log({ message: 'skipping module without name+run()', file: f });
      }
    } catch (e) {
      ctx.log({ message: 'failed to load agent', file: f, error: String(e) });
    }
  }
  return agents;
}

async function runJob(agent) {
  try {
    await Promise.resolve(agent.run(ctx));
    if ((agent._failures || 0) >= MAX_CONSECUTIVE_FAILURES) {
      ctx.log({ agent: agent.name, message: `recovered after ${agent._failures} consecutive failures` });
    }
    agent._failures = 0;
    return true;
  } catch (err) {
    agent._failures = (agent._failures || 0) + 1;
    ctx.log({ agent: agent.name, error: String(err && err.stack ? err.stack : err), failures: agent._failures });
    if (agent._failures === MAX_CONSECUTIVE_FAILURES) {
      ctx.escalate({
        agent: agent.name,
        message: `Job "${agent.name}" has failed ${agent._failures}x in a row (last: ${err && err.message}). Still retrying on its interval.`,
      });
    }
    return false;
  } finally {
    agent._lastFinish = Date.now();
  }
}

async function runOnce() {
  ctx.log({ message: 'hermes runner starting --once', agentsDir: AGENTS_DIR });
  const agents = loadAgents();
  ctx.log({ message: 'agents_loaded', count: agents.length, names: agents.map((a) => a.name) });

  let anyFailed = false;
  for (const agent of agents) {
    ctx.log({ agent: agent.name, message: 'run_start' });
    const ok = await runJob(agent);
    ctx.log({ agent: agent.name, message: ok ? 'run_complete' : 'run_failed' });
    if (!ok) anyFailed = true;
  }

  ctx.log({ message: 'hermes runner --once complete', anyFailed });
  return anyFailed;
}

function runDaemon() {
  const agents = loadAgents();
  ctx.log({ message: 'hermes runner starting daemon', agents: agents.map((a) => a.name) });

  for (const agent of agents) {
    agent._lastFinish = Date.now();
    runJob(agent);
    setInterval(() => runJob(agent), agent.intervalMs || 60_000);
  }

  // Heartbeat so Docker's HEALTHCHECK (hermes/healthcheck.js) has something
  // to check even if no agent named "heartbeat" is present.
  setInterval(() => {
    try {
      fs.writeFileSync(HEARTBEAT_FILE, new Date().toISOString());
    } catch (e) {
      ctx.log({ message: 'heartbeat write failed', error: String(e) });
    }
  }, 60_000);

  // Self-watchdog: pure HANG detector. An agent that never returns (stuck
  // network call, wedged event loop) stops updating _lastFinish even in its
  // finally block; exit so the restart policy replaces the process. Agents
  // that run-and-fail update _lastFinish and never trip this.
  setInterval(() => {
    for (const agent of agents) {
      const staleAfter = agent.staleAfterMs || 24 * 3_600_000;
      if (Date.now() - agent._lastFinish > staleAfter) {
        ctx.log({ message: `watchdog: agent "${agent.name}" stale; exiting for restart`, level: 'fatal' });
        ctx.escalate({
          agent: 'orchestrator',
          message: `Watchdog restart: agent "${agent.name}" went stale (no completed run in ${Math.round(staleAfter / 3_600_000)}h).`,
        });
        process.exit(1);
      }
    }
  }, 60_000);

  for (const sig of ['SIGTERM', 'SIGINT']) {
    process.on(sig, () => {
      ctx.log({ message: `${sig} received; shutting down cleanly` });
      process.exit(0);
    });
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--once')) {
    const anyFailed = await runOnce();
    process.exit(anyFailed ? 1 : 0);
  }
  runDaemon();
}

process.on('uncaughtException', (err) => {
  appendAudit({ type: 'log', entry: { level: 'fatal', message: `uncaught exception: ${err.stack || err.message}` } });
  console.error('hermes runner fatal', err);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  appendAudit({ type: 'log', entry: { level: 'fatal', message: `unhandled rejection: ${err && (err.stack || err.message)}` } });
  console.error('hermes runner fatal (unhandled rejection)', err);
  process.exit(1);
});

if (require.main === module) {
  main();
}

module.exports = { ctx, loadAgents, DATA_DIR };
