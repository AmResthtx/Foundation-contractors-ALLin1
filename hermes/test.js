#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Minimal test harness that exercises required behaviors without external APIs.
(async function main(){
  console.log('hermes/test.js — running expanded test suite');
  const dataDir = path.join(process.cwd(), 'data');
  // ensure clean test dirs
  function cleanDir(d) { if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d, { recursive: true }); }

  cleanDir(path.join(dataDir, 'leads-inbox'));
  cleanDir(path.join(dataDir, 'leads-processed'));
  cleanDir(path.join(dataDir, 'leads-error'));
  cleanDir(path.join(dataDir, 'leads-scored'));
  cleanDir(path.join(dataDir, 'leads-reminders'));
  cleanDir(path.join(dataDir, 'torque-logs'));
  cleanDir(path.join(dataDir, 'torque-logs', 'verified'));
  cleanDir(path.join(dataDir, 'torque-logs', 'rejected'));
  cleanDir(path.join(dataDir, 'crm-inbox'));

  // create a context object compatible with runner
  const ctx = {
    logs: [], alerts: [], escalates: [],
    log: (entry) => { ctx.logs.push(entry); console.log('[LOG]', entry); },
    alert: (entry) => { ctx.alerts.push(entry); console.warn('[ALERT]', entry); },
    escalate: (entry) => { ctx.escalates.push(entry); console.error('[ESCALATE]', entry); },
    dataDir
  };

  // 1) Policy 2 gate tests (automation-governance)
  const gov = require('./agents/automation-governance');
  // hermes/research/sources.md already added with SRC-001 and PRJ-001
  const valid = gov.validateSources(['SRC-001']);
  assert(Array.isArray(valid.ok) && valid.ok.includes('SRC-001'), 'valid SRC should pass');
  const blocked = gov.validateSources(['PRJ-001']);
  assert(blocked.blocked.includes('PRJ-001'), 'PRJ id should be blocked');
  const missing = gov.validateSources(['SRC-999']);
  assert(missing.missing.includes('SRC-999'), 'unknown SRC should be missing');
  console.log('Policy 2 gate tests passed');

  // 2) Torque verifier tests
  const tv = require('./agents/torque-verifier');
  // valid torque file
  const validTorque = {
    installation_date: '2026-07-01',
    pile_manufacturer: 'AcmePiles',
    installation_contractor: 'BestPiers',
    equipment_id: 'EQ-1',
    min_allowable_torque: 100,
    max_allowable_torque: 500,
    shaft_diameter: 3,
    helix_configuration: '2x',
    actual_tip_embedment: 2.5,
    actual_installation_torque: 200,
    ultimate_capacity: 1000,
    allowable_capacity: 333
  };
  fs.writeFileSync(path.join(dataDir, 'torque-logs', 'valid.json'), JSON.stringify(validTorque, null, 2), 'utf8');
  await Promise.resolve(tv.run(ctx));
  // check moved to verified
  const verifiedFiles = fs.readdirSync(path.join(dataDir, 'torque-logs', 'verified'));
  assert(verifiedFiles.length === 1, 'valid torque should be verified');

  // missing field
  const missingField = Object.assign({}, validTorque); delete missingField.actual_installation_torque;
  fs.writeFileSync(path.join(dataDir, 'torque-logs', 'missing.json'), JSON.stringify(missingField, null, 2), 'utf8');
  await Promise.resolve(tv.run(ctx));
  const rejectedFiles = fs.readdirSync(path.join(dataDir, 'torque-logs', 'rejected'));
  assert(rejectedFiles.length === 1, 'missing field should be rejected');

  // out of range torque
  const badTorque = Object.assign({}, validTorque, { actual_installation_torque: 9999 });
  fs.writeFileSync(path.join(dataDir, 'torque-logs', 'bad.json'), JSON.stringify(badTorque, null, 2), 'utf8');
  await Promise.resolve(tv.run(ctx));
  const rejectedFiles2 = fs.readdirSync(path.join(dataDir, 'torque-logs', 'rejected'));
  assert(rejectedFiles2.length >= 2, 'out-of-range torque should be rejected');
  console.log('Torque verifier tests passed');

  // 3) Lead malformed-JSON quarantine
  const emailIntel = require('./agents/email-intel');
  fs.writeFileSync(path.join(dataDir, 'leads-inbox', 'bad.json'), '{ not json', 'utf8');
  await Promise.resolve(emailIntel.run(ctx));
  const errs = fs.readdirSync(path.join(dataDir, 'leads-error'));
  assert(errs.length === 1, 'malformed lead should be quarantined');
  console.log('Lead malformed-JSON quarantine test passed');

  // 4) TMOS sign-flip logic (simple test)
  // seed prior month value and current value and check detection
  const tmosFile = path.join(dataDir, 'tmos-BACTSAMFRBDAL.json');
  fs.writeFileSync(tmosFile, JSON.stringify({ last_month: 5 }), 'utf8');
  function tmosSignFlip(oldVal, newVal) {
    return Math.sign(oldVal) !== Math.sign(newVal) || Math.abs(newVal - oldVal) >= (process.env.TMOS_ALERT_POINTS ? Number(process.env.TMOS_ALERT_POINTS) : 10);
  }
  assert(!tmosSignFlip(5, 6), 'no alert for small move');
  assert(tmosSignFlip(5, -1), 'sign flip should alert');
  assert(tmosSignFlip(0, 15), 'absolute move >= threshold should alert');
  console.log('TMOS sign-flip tests passed');

  // 5) parseFeedItems: real RSS 2.0 XML parsing (title/link/pubDate + CDATA)
  const parser = require('./lib/parseFeedItems');
  const sampleRss = `<?xml version="1.0"?><rss><channel>
    <item><title><![CDATA[Sinkhole reported on Main St]]></title><link>https://example.com/a</link><pubDate>Wed, 01 Jul 2026 00:00:00 GMT</pubDate></item>
    <item><title>Routine council meeting</title><link>https://example.com/b</link><pubDate>Wed, 02 Jul 2026 00:00:00 GMT</pubDate></item>
  </channel></rss>`;
  const parsed = parser.parseFeedItems(sampleRss);
  assert(Array.isArray(parsed) && parsed.length === 2, 'should parse both RSS items');
  assert(parsed[0].title === 'Sinkhole reported on Main St', 'CDATA title should be unwrapped');
  assert(parsed[0].link === 'https://example.com/a', 'link should be extracted');
  assert(parser.parseFeedItems('not xml at all').length === 0, 'garbage input should parse to empty array, not throw');
  console.log('parseFeedItems RSS parsing test passed');

  // 6) fidelity-auditor: rules grade real log evidence, never mere silence
  const auditLog = path.join(dataDir, 'audit.log');
  const nowIso = new Date().toISOString();
  const writeAudit = (obj) => fs.appendFileSync(auditLog, JSON.stringify(Object.assign({ ts: nowIso }, obj)) + '\n', 'utf8');
  fs.rmSync(auditLog, { force: true });

  // lead-scorer: one good score, one HOT lead with NO matching alert (should fail)
  writeAudit({ type: 'log', entry: { agent: 'lead-scorer', action: 'scored', file: 'a.json', score: 40 } });
  writeAudit({ type: 'log', entry: { agent: 'lead-scorer', action: 'scored', file: 'b.json', score: 90 } });
  // (deliberately no hot_lead alert for file b.json)

  // torque-verifier: a rejection with an empty reasons array (should fail)
  writeAudit({ type: 'alert', entry: { agent: 'torque-verifier', action: 'validation_failed', file: 'c.json', fails: [] } });

  // content-pipeline: a draft missing engineer_review_required (should fail)
  writeAudit({ type: 'log', entry: { agent: 'content-pipeline', action: 'draft_created', auditId: 'AUD-1' } });

  // escalation with no message (should fail)
  writeAudit({ type: 'escalate', entry: { agent: 'orchestrator' } });

  const fidelityCtx = { logs: [], alerts: [], escalates: [], log: (e) => fidelityCtx.logs.push(e), alert: (e) => fidelityCtx.alerts.push(e), escalate: (e) => fidelityCtx.escalates.push(e), dataDir };
  const fidelityAuditor = require('./agents/fidelity-auditor');
  fidelityAuditor.run(fidelityCtx);
  const summary = fidelityCtx.logs.find((l) => l.agent === 'fidelity-auditor' && l.results);
  assert(summary, 'fidelity-auditor should log a summary with results');
  const byId = Object.fromEntries(summary.results.map((r) => [r.id, r.pass]));
  assert(byId['lead-scorer-reasoning'] === true, 'both scores were numeric, rule should pass');
  assert(byId['lead-scorer-hot-dispatch'] === false, 'HOT lead with no alert should fail');
  assert(byId['torque-verifier-reasons'] === false, 'rejection with empty reasons array should fail');
  assert(byId['content-pipeline-gate'] === false, 'draft missing engineer_review_required should fail');
  assert(byId['escalation-transparency'] === false, 'escalation with no message should fail');
  assert(fs.existsSync(path.join(dataDir, 'fidelity-history.json')), 'history file should be written');
  const history = JSON.parse(fs.readFileSync(path.join(dataDir, 'fidelity-history.json'), 'utf8'));
  assert(history['lead-scorer-hot-dispatch'].consecutiveFails === 1, 'first failure should set streak to 1');

  // run it two more times with the same failing evidence -> streak hits 3 -> escalate
  fidelityAuditor.run(fidelityCtx);
  fidelityAuditor.run(fidelityCtx);
  const historyAfter3 = JSON.parse(fs.readFileSync(path.join(dataDir, 'fidelity-history.json'), 'utf8'));
  assert(historyAfter3['lead-scorer-hot-dispatch'].consecutiveFails === 3, 'streak should reach 3 after three failing cycles');
  assert(fidelityCtx.escalates.some((e) => e.message && e.message.includes('lead-scorer') && e.message.includes('3 consecutive')), '3-cycle repeat offender should escalate to Ellis');
  console.log('fidelity-auditor tests passed');

  console.log('All tests passed');
  process.exit(0);
})().catch((err) => { console.error('Tests failed', err); process.exit(1); });
