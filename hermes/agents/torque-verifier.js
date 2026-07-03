const fs = require('fs');
const path = require('path');
const civ = require('./civil-engineer');

module.exports = {
  name: 'torque-verifier',
  intervalMs: 1000 * 60 * 5, // every 5 minutes
  staleAfterMs: 1000 * 60 * 60 * 24,
  run(ctx) {
    const inDir = path.join(process.cwd(), 'data', 'torque-logs');
    if (!fs.existsSync(inDir)) return ctx.log({ agent: module.exports.name, message: 'no torque logs' });
    const files = fs.readdirSync(inDir).filter(f => f.endsWith('.json'));
    for (const f of files) {
      const full = path.join(inDir, f);
      try {
        const obj = JSON.parse(fs.readFileSync(full, 'utf8'));
        // Check presence of all 12 fields
        const missing = [];
        for (const fld of civ.PE_FIELDS) {
          if (obj[fld] === undefined || obj[fld] === null || obj[fld] === '') missing.push(fld);
        }
        if (missing.length > 0) {
          // reject
          const rejDir = path.join(inDir, 'rejected');
          fs.mkdirSync(rejDir, { recursive: true });
          fs.renameSync(full, path.join(rejDir, f));
          ctx.alert({ agent: module.exports.name, action: 'rejected_missing_fields', file: f, missing });
          continue;
        }
        // numeric sanity checks
        const min = Number(obj.min_allowable_torque);
        const max = Number(obj.max_allowable_torque);
        const actual = Number(obj.actual_installation_torque);
        const embed = Number(obj.actual_tip_embedment);
        const ultimate = Number(obj.ultimate_capacity);
        const allowable = Number(obj.allowable_capacity);
        const fails = [];
        if (isNaN(min) || isNaN(max) || min > max) fails.push('min_max_invalid');
        if (isNaN(actual) || actual < min || actual > max) fails.push('actual_out_of_range');
        if (isNaN(embed) || embed <= 0) fails.push('embedment_invalid');
        if (isNaN(ultimate) || ultimate <= 0) fails.push('ultimate_invalid');
        if (isNaN(allowable) || allowable <= 0) fails.push('allowable_invalid');

        if (fails.length > 0) {
          const rejDir = path.join(inDir, 'rejected');
          fs.mkdirSync(rejDir, { recursive: true });
          fs.renameSync(full, path.join(rejDir, f));
          ctx.alert({ agent: module.exports.name, action: 'validation_failed', file: f, fails });
          continue;
        }
        // passed
        const verDir = path.join(inDir, 'verified');
        fs.mkdirSync(verDir, { recursive: true });
        fs.renameSync(full, path.join(verDir, f));
        ctx.log({ agent: module.exports.name, action: 'verified', file: f, note: 'payment clearance OK' });
      } catch (err) {
        ctx.log({ agent: module.exports.name, error: String(err), file: f });
      }
    }
  }
};
