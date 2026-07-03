#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.join(__dirname, 'agents');
const DATA_DIR = path.join(process.cwd(), 'data');
const AUDIT_LOG = path.join(__dirname, 'audit.log');

function appendAudit(obj) {
  try {
    const line = JSON.stringify(Object.assign({ ts: new Date().toISOString() }, obj)) + '\n';
    fs.appendFileSync(AUDIT_LOG, line, { encoding: 'utf8' });
  } catch (e) {
    // best-effort
    console.error('failed to append audit log', e);
  }
}

const ctx = {
  log: (entry) => {
    // entry can be an object or string
    const payload = typeof entry === 'string' ? { message: entry } : entry || {};
    console.log('[LOG]', payload);
    appendAudit({ type: 'log', entry: payload });
  },
  alert: (msg) => {
    console.warn('[ALERT]', msg);
    appendAudit({ type: 'alert', message: msg });
  },
  escalate: (msg) => {
    console.error('[ESCALATE]', msg);
    appendAudit({ type: 'escalate', message: msg });
  },
  dataDir: DATA_DIR,
};

async function loadAgents() {
  const agents = [];
  if (!fs.existsSync(AGENTS_DIR)) return agents;
  const files = fs.readdirSync(AGENTS_DIR);
  for (const f of files) {
    if (!f.endsWith('.js')) continue;
    const full = path.join(AGENTS_DIR, f);
    try {
      const mod = require(full);
      // accept modules exporting run(ctx) and metadata
      if (mod && typeof mod.run === 'function') {
        agents.push(mod);
      } else {
        ctx.log({ message: 'skipping agent without run()', file: f });
      }
    } catch (e) {
      ctx.log({ message: 'failed to load agent', file: f, error: String(e) });
    }
  }
  return agents;
}

async function runOnce() {
  ctx.log({ message: 'hermes runner starting --once', agentsDir: AGENTS_DIR });
  const agents = await loadAgents();
  ctx.log({ message: 'agents_loaded', count: agents.length });

  for (const a of agents) {
    try {
      ctx.log({ message: 'agent_run_start', agent: a.name });
      // allow run to return a promise
      await Promise.resolve(a.run(ctx));
      ctx.log({ message: 'agent_run_complete', agent: a.name });
    } catch (e) {
      ctx.log({ message: 'agent_run_error', agent: a.name, error: String(e) });
      // preserve existing behavior: log and continue
      ctx.escalate({ agent: a.name, error: String(e) });
    }
  }

  ctx.log({ message: 'hermes runner --once complete' });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--once')) {
    await runOnce();
    process.exit(0);
  }

  // simple loop mode (not used in tests) — run every minute
  ctx.log({ message: 'hermes runner starting loop (ctrl-c to stop)' });
  while (true) {
    await runOnce();
    await new Promise((r) => setTimeout(r, 60 * 1000));
  }
}

main().catch((err) => {
  console.error('hermes runner fatal', err);
  process.exit(1);
});
