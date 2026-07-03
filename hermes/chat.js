#!/usr/bin/env node
// Two-way command channel for talking to the Hermes orchestrator from a
// terminal (docs/RUNBOOK.md "Talking to Hermes" — this is the CLI half of
// the two-way channel; hermes/n8n/hermes-telegram-notify.json is the alert
// half, one-way today).
//
// Usage:
//   node hermes/chat.js                        interactive REPL
//   node hermes/chat.js status                  agent roster + last run/error per agent
//   node hermes/chat.js run <agent-name>         trigger one agent's run() immediately
//   node hermes/chat.js ask "<question>"         free-text Q&A grounded in hermes/research/*.md
//   node hermes/chat.js lead <name> <contact> <message>   drop a lead into the intake pipeline
//   node hermes/chat.js torque-status            counts of pending/verified/rejected torque logs
//
// Every command's request + response is written to the audit log (Policy 2)
// exactly like an agent action — this is Ellis acting through Hermes, not a
// side channel exempt from the audit trail.

'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { ctx, loadAgents, DATA_DIR } = require('./index.js');
const { callAnthropic } = require('./lib/anthropic');

const RESEARCH_DIR = path.join(__dirname, 'research');
const AUDIT_LOG = path.join(DATA_DIR, 'audit.log');

function auditCommand(command, args, result) {
  ctx.log({ agent: 'chat', message: 'command', command, args, result: typeof result === 'string' ? result.slice(0, 2000) : result });
}

function humanInterval(ms) {
  if (!ms) return 'unknown';
  const mins = ms / 60_000;
  if (mins < 60) return `${mins}m`;
  const hours = mins / 60;
  if (hours < 24) return `${hours}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

// Scan the audit log tail for each agent's most recent run outcome. Reads
// backwards conceptually by just tailing the last N lines — audit.log can
// grow large over time and this only needs recent state, not full history.
function lastRunStatus(agentNames) {
  const status = {};
  for (const name of agentNames) status[name] = { lastEvent: null, ts: null };
  if (!fs.existsSync(AUDIT_LOG)) return status;
  const lines = fs.readFileSync(AUDIT_LOG, 'utf8').split('\n').filter(Boolean).slice(-5000);
  for (const line of lines) {
    let obj;
    try {
      obj = JSON.parse(line);
    } catch (_e) {
      continue;
    }
    const entry = obj.entry || {};
    const agent = entry.agent;
    if (!agent || !(agent in status)) continue;
    if (entry.message === 'run_complete' || entry.message === 'run_failed' || entry.error) {
      status[agent] = { lastEvent: entry.error ? 'error' : entry.message, ts: obj.ts, detail: entry.error };
    }
  }
  return status;
}

function cmdStatus() {
  const agents = loadAgents();
  const statuses = lastRunStatus(agents.map((a) => a.name));
  const lines = agents.map((a) => {
    const s = statuses[a.name] || {};
    const last = s.ts ? `${s.lastEvent || 'no run yet'} @ ${s.ts}` : 'no run recorded yet';
    const detail = s.detail ? ` — ${String(s.detail).slice(0, 120)}` : '';
    return `  ${a.name.padEnd(24)} every ${humanInterval(a.intervalMs).padEnd(6)} stale-after ${humanInterval(a.staleAfterMs).padEnd(6)} last: ${last}${detail}`;
  });
  const out = `Hermes agents (${agents.length}):\n${lines.join('\n')}`;
  console.log(out);
  auditCommand('status', {}, { agentCount: agents.length });
  return out;
}

async function cmdRun(agentName) {
  if (!agentName) {
    console.log('usage: run <agent-name>  (see `status` for names)');
    return;
  }
  const agents = loadAgents();
  const agent = agents.find((a) => a.name === agentName);
  if (!agent) {
    console.log(`no agent named "${agentName}". Known: ${agents.map((a) => a.name).join(', ')}`);
    return;
  }
  console.log(`running ${agentName}...`);
  try {
    await Promise.resolve(agent.run(ctx));
    console.log(`${agentName} completed.`);
    auditCommand('run', { agent: agentName }, 'ok');
  } catch (e) {
    console.log(`${agentName} failed: ${e.message}`);
    auditCommand('run', { agent: agentName }, `error: ${e.message}`);
  }
}

function loadResearchKb() {
  if (!fs.existsSync(RESEARCH_DIR)) return '';
  const files = fs.readdirSync(RESEARCH_DIR).filter((f) => f.endsWith('.md'));
  let combined = '';
  for (const f of files) {
    combined += `\n\n### ${f}\n` + fs.readFileSync(path.join(RESEARCH_DIR, f), 'utf8');
  }
  // Keep well under a typical context window; the KB is meant to stay small
  // per POLICIES.md ("living reference", not a data dump).
  return combined.slice(0, 60_000);
}

async function cmdAsk(question) {
  if (!question) {
    console.log('usage: ask "<question>"');
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('ANTHROPIC_API_KEY is not set — cannot answer free-text questions. Set it in .env and restart.');
    auditCommand('ask', { question }, 'skipped: no_key');
    return;
  }
  const kb = loadResearchKb();
  const prompt = `You are Hermes, the orchestrating agent for a helical-pier foundation contracting company. Answer the question using ONLY the knowledge base below. If the KB doesn't cover it, say so plainly instead of guessing. Cite SRC-### or PRJ-### trace IDs where you draw on a specific fact.\n\nKNOWLEDGE BASE:${kb}\n\nQUESTION: ${question}`;
  try {
    const answer = await callAnthropic(prompt, { maxTokens: 1024 });
    console.log(answer);
    auditCommand('ask', { question }, answer);
    return answer;
  } catch (e) {
    console.log(`could not get an answer: ${e.message}`);
    auditCommand('ask', { question }, `error: ${e.message}`);
  }
}

function cmdLead(name, contact, message) {
  if (!name || !contact || !message) {
    console.log('usage: lead <name> <contact> "<message>"');
    return;
  }
  const inbox = path.join(DATA_DIR, 'leads-inbox');
  fs.mkdirSync(inbox, { recursive: true });
  const id = `lead-${Date.now()}`;
  const file = path.join(inbox, `${id}.json`);
  fs.writeFileSync(file, JSON.stringify({ name, contact, message, ts: new Date().toISOString() }, null, 2), 'utf8');
  console.log(`lead written to ${file}. It will be picked up by email-intel then lead-scorer on their next interval (or run them now: \`run email-intel\` then \`run lead-scorer\`).`);
  auditCommand('lead', { name, contact }, `written: ${id}`);
}

function cmdTorqueStatus() {
  const base = path.join(DATA_DIR, 'torque-logs');
  const count = (dir) => {
    const full = path.join(base, dir);
    return fs.existsSync(full) ? fs.readdirSync(full).filter((f) => f.endsWith('.json')).length : 0;
  };
  const pending = fs.existsSync(base) ? fs.readdirSync(base).filter((f) => f.endsWith('.json')).length : 0;
  const out = `torque logs — pending: ${pending}, verified: ${count('verified')}, rejected: ${count('rejected')}`;
  console.log(out);
  auditCommand('torque-status', {}, out);
  return out;
}

function cmdFidelityStatus() {
  const historyFile = path.join(DATA_DIR, 'fidelity-history.json');
  if (!fs.existsSync(historyFile)) {
    const out = 'no fidelity audit has run yet (runs weekly, or trigger now: `run fidelity-auditor`)';
    console.log(out);
    auditCommand('fidelity-status', {}, out);
    return out;
  }
  const history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
  const lines = Object.entries(history).map(([id, h]) => {
    const flag = h.consecutiveFails >= 3 ? ' [ESCALATED]' : h.consecutiveFails > 0 ? ' [failing]' : '';
    return `  ${id.padEnd(28)} ${h.lastResult.padEnd(4)} streak:${h.consecutiveFails}${flag} (${h.agent}, ${h.policy})`;
  });
  const out = `Fidelity audit rules:\n${lines.join('\n')}`;
  console.log(out);
  auditCommand('fidelity-status', {}, { ruleCount: Object.keys(history).length });
  return out;
}

async function dispatch(command, args) {
  switch (command) {
    case 'status':
      return cmdStatus();
    case 'run':
      return cmdRun(args[0]);
    case 'ask':
      return cmdAsk(args.join(' '));
    case 'lead':
      return cmdLead(args[0], args[1], args.slice(2).join(' '));
    case 'torque-status':
      return cmdTorqueStatus();
    case 'fidelity-status':
      return cmdFidelityStatus();
    case 'help':
    case undefined:
      console.log('commands: status | run <agent> | ask "<question>" | lead <name> <contact> "<message>" | torque-status | fidelity-status | help | exit');
      return;
    default:
      console.log(`unknown command "${command}". Type "help".`);
  }
}

async function repl() {
  console.log('Hermes chat — type "help" for commands, "exit" to quit.');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'hermes> ' });
  rl.prompt();
  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (trimmed === 'exit' || trimmed === 'quit') {
      rl.close();
      return;
    }
    if (trimmed) {
      const [command, ...rest] = trimmed.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
      const args = rest ? rest.map((a) => a.replace(/^"|"$/g, '')) : [];
      try {
        await dispatch(command, args);
      } catch (e) {
        console.error(`error: ${e.message}`);
      }
    }
    rl.prompt();
  });
  rl.on('close', () => process.exit(0));
}

async function main() {
  const [, , command, ...args] = process.argv;
  if (!command) {
    await repl();
    return;
  }
  await dispatch(command, args);
}

main().catch((e) => {
  console.error('hermes chat fatal', e);
  process.exit(1);
});
