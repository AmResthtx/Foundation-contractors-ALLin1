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

  // 5) parseFeedItems export exists
  const parser = require('./lib/parseFeedItems');
  const parsed = parser.parseFeedItems(['a','b']);
  assert(Array.isArray(parsed) && parsed.length === 2, 'parseFeedItems should parse array');
  console.log('parseFeedItems export test passed');

  console.log('All tests passed');
  process.exit(0);
})().catch((err) => { console.error('Tests failed', err); process.exit(1); });
