'use strict';

const fs = require('fs');
const path = require('path');

// Policy 4: "Fidelity auditor scores each agent against charter... 3-cycle
// repeat offenders escalate to Ellis." Grading is against ADHERENCE, not
// outcomes (a quiet week is a PASS, not evidence of nothing) — every rule
// below only fails when there's log evidence of a specific broken behavior,
// never on absence of activity. Absence-of-activity is the watchdog's job
// (hermes/index.js staleAfterMs), not this agent's.

const WINDOW_MS = 7 * 24 * 3_600_000; // one audit cycle = one week
const HISTORY_FILE_NAME = 'fidelity-history.json';
const REPORT_FILE_NAME = 'audit-reports.md'; // runtime output in dataDir, not a committed research doc

function readAuditWindow(dataDir, windowMs) {
  const auditFile = path.join(dataDir, 'audit.log');
  if (!fs.existsSync(auditFile)) return [];
  const cutoff = Date.now() - windowMs;
  const lines = fs.readFileSync(auditFile, 'utf8').split('\n').filter(Boolean);
  const entries = [];
  for (const line of lines) {
    let obj;
    try {
      obj = JSON.parse(line);
    } catch (_e) {
      continue;
    }
    if (obj.ts && new Date(obj.ts).getTime() >= cutoff) entries.push(obj);
  }
  return entries;
}

// Each rule: { id, agent, policy, check(entries) -> {pass, detail, n} }.
// "n" is the sample size the verdict is based on (0 = no evidence this
// cycle, always a PASS — untested is not the same as failing).
const RULES = [
  {
    id: 'lead-scorer-reasoning',
    agent: 'lead-scorer',
    policy: 'Policy 7 — lead scoring transparency',
    check(entries) {
      const scored = entries.filter((e) => e.type === 'log' && e.entry && e.entry.agent === 'lead-scorer' && e.entry.action === 'scored');
      if (scored.length === 0) return { pass: true, detail: 'no leads scored this cycle', n: 0 };
      const bad = scored.filter((e) => typeof e.entry.score !== 'number' || Number.isNaN(e.entry.score));
      return {
        pass: bad.length === 0,
        detail: bad.length ? `${bad.length}/${scored.length} scored entries missing a numeric score` : `${scored.length} lead(s) scored, all had a numeric score`,
        n: scored.length,
      };
    },
  },
  {
    id: 'lead-scorer-hot-dispatch',
    agent: 'lead-scorer',
    policy: 'Policy 7 — hot leads dispatch within 24h',
    check(entries) {
      const scored = entries.filter((e) => e.type === 'log' && e.entry && e.entry.agent === 'lead-scorer' && e.entry.action === 'scored');
      const hot = scored.filter((e) => e.entry.score >= 70);
      if (hot.length === 0) return { pass: true, detail: 'no HOT leads this cycle', n: 0 };
      const alerts = entries.filter((e) => e.type === 'alert' && e.entry && e.entry.type === 'hot_lead');
      const pass = alerts.length >= hot.length;
      return {
        pass,
        detail: pass ? `${hot.length} HOT lead(s), ${alerts.length} alert(s) fired` : `${hot.length} HOT lead(s) scored but only ${alerts.length} alert(s) fired`,
        n: hot.length,
      };
    },
  },
  {
    id: 'torque-verifier-reasons',
    agent: 'torque-verifier',
    policy: 'Policy 6 — payment blocking, no fabrication',
    check(entries) {
      const rejections = entries.filter(
        (e) => e.type === 'alert' && e.entry && e.entry.agent === 'torque-verifier' && (e.entry.action === 'rejected_missing_fields' || e.entry.action === 'validation_failed')
      );
      if (rejections.length === 0) return { pass: true, detail: 'no rejections this cycle', n: 0 };
      const unexplained = rejections.filter((e) => {
        const reasons = e.entry.missing || e.entry.fails;
        return !Array.isArray(reasons) || reasons.length === 0;
      });
      return {
        pass: unexplained.length === 0,
        detail: unexplained.length ? `${unexplained.length}/${rejections.length} rejections had no reason recorded` : `${rejections.length} rejection(s), all with a named reason`,
        n: rejections.length,
      };
    },
  },
  {
    id: 'content-pipeline-gate',
    agent: 'content-pipeline',
    policy: 'Policy 2 — stress-test before publishing',
    check(entries) {
      const drafted = entries.filter((e) => e.type === 'log' && e.entry && e.entry.agent === 'content-pipeline' && e.entry.action === 'draft_created');
      if (drafted.length === 0) return { pass: true, detail: 'no drafts created this cycle', n: 0 };
      const incomplete = drafted.filter((e) => typeof e.entry.engineer_review_required !== 'boolean');
      return {
        pass: incomplete.length === 0,
        detail: incomplete.length
          ? `${incomplete.length}/${drafted.length} drafts missing the engineer_review_required flag (gate may have been bypassed)`
          : `${drafted.length} draft(s), all passed through the full gate`,
        n: drafted.length,
      };
    },
  },
  {
    id: 'escalation-transparency',
    agent: 'orchestrator',
    policy: 'Policy 5 — transparent automation, all escalations traceable',
    check(entries) {
      const escalations = entries.filter((e) => e.type === 'escalate');
      if (escalations.length === 0) return { pass: true, detail: 'no escalations this cycle', n: 0 };
      const silent = escalations.filter((e) => !e.entry || !(e.entry.message || e.entry.msg));
      return {
        pass: silent.length === 0,
        detail: silent.length ? `${silent.length}/${escalations.length} escalations had no message` : `${escalations.length} escalation(s), all carried a reason`,
        n: escalations.length,
      };
    },
  },
];

function loadHistory(dataDir) {
  const file = path.join(dataDir, HISTORY_FILE_NAME);
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_e) {
    return {};
  }
}

function saveHistory(dataDir, history) {
  fs.writeFileSync(path.join(dataDir, HISTORY_FILE_NAME), JSON.stringify(history, null, 2), 'utf8');
}

function appendReport(dataDir, results, history) {
  const ts = new Date().toISOString();
  const reportFile = path.join(dataDir, REPORT_FILE_NAME);
  const lines = [];
  if (!fs.existsSync(reportFile)) {
    lines.push(
      '# Fidelity Audit Reports',
      '',
      'Append-only log from hermes/agents/fidelity-auditor.js (Policy 4: "Fidelity auditor',
      'scores each agent against charter... 3-cycle repeat offenders escalate to Ellis").',
      'Runtime-generated (lives in dataDir alongside audit.log, not committed to the repo).',
      ''
    );
  }
  lines.push(`## Fidelity audit — ${ts}`, '');
  for (const r of results) {
    const streak = history[r.id] ? history[r.id].consecutiveFails : 0;
    lines.push(`- **${r.id}** (${r.agent}, ${r.policy}): ${r.pass ? 'PASS' : 'FAIL'} — ${r.detail}${!r.pass && streak > 0 ? ` _(${streak} consecutive cycles)_` : ''}`);
  }
  fs.appendFileSync(reportFile, lines.join('\n') + '\n', 'utf8');
}

module.exports = {
  name: 'fidelity-auditor',
  intervalMs: WINDOW_MS,
  staleAfterMs: 3 * WINDOW_MS,
  RULES, // exported for tests
  run(ctx) {
    const entries = readAuditWindow(ctx.dataDir, WINDOW_MS);
    const results = RULES.map((rule) => Object.assign({ id: rule.id, agent: rule.agent, policy: rule.policy }, rule.check(entries)));

    const history = loadHistory(ctx.dataDir);
    for (const r of results) {
      const prior = history[r.id] || { consecutiveFails: 0 };
      const consecutiveFails = r.pass ? 0 : (prior.consecutiveFails || 0) + 1;
      history[r.id] = { consecutiveFails, lastResult: r.pass ? 'PASS' : 'FAIL', lastRunTs: new Date().toISOString(), agent: r.agent, policy: r.policy };
      if (!r.pass && consecutiveFails > 0 && consecutiveFails % 3 === 0) {
        ctx.escalate({
          agent: 'fidelity-auditor',
          message: `${r.agent} has failed "${r.id}" (${r.policy}) for ${consecutiveFails} consecutive audit cycles. Latest: ${r.detail}`,
        });
      }
    }
    saveHistory(ctx.dataDir, history);
    appendReport(ctx.dataDir, results, history);

    const failCount = results.filter((r) => !r.pass).length;
    ctx.log({ agent: module.exports.name, message: `audit complete: ${results.length - failCount}/${results.length} rules pass`, results: results.map((r) => ({ id: r.id, pass: r.pass })) });
  },
};
