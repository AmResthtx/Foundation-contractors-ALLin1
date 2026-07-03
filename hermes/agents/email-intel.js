const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'email-intel',
  intervalMs: 1000 * 60 * 1, // every minute
  staleAfterMs: 1000 * 60 * 60 * 24,
  run(ctx) {
    const inbox = path.join(process.cwd(), 'data', 'leads-inbox');
    const processed = path.join(process.cwd(), 'data', 'leads-processed');
    const errors = path.join(process.cwd(), 'data', 'leads-error');
    try {
      if (!fs.existsSync(inbox)) return ctx.log({ agent: module.exports.name, message: 'no inbox' });
      const files = fs.readdirSync(inbox).filter(f => f.endsWith('.json'));
      for (const f of files) {
        const src = path.join(inbox, f);
        let raw;
        try {
          raw = fs.readFileSync(src, 'utf8');
        } catch (e) {
          ctx.log({ agent: module.exports.name, error: 'read_failed', file: f, e: String(e) });
          continue;
        }
        let obj;
        try {
          obj = JSON.parse(raw);
        } catch (e) {
          // malformed JSON -> quarantine
          const badDest = path.join(errors, f + '.malformed');
          fs.mkdirSync(errors, { recursive: true });
          fs.writeFileSync(badDest, raw, 'utf8');
          fs.unlinkSync(src);
          ctx.log({ agent: module.exports.name, action: 'malformed_json', file: f, reason: String(e) });
          continue;
        }
        // validate expected shape
        const ok = obj && obj.name && obj.contact && obj.message && obj.ts;
        if (!ok) {
          fs.mkdirSync(errors, { recursive: true });
          const badDest = path.join(errors, f + '.invalid');
          fs.writeFileSync(badDest, JSON.stringify({ reason: 'missing_fields', payload: obj }, null, 2), 'utf8');
          fs.unlinkSync(src);
          ctx.log({ agent: module.exports.name, action: 'invalid_payload', file: f });
          continue;
        }
        // write processed
        fs.mkdirSync(processed, { recursive: true });
        const dest = path.join(processed, f);
        fs.writeFileSync(dest, JSON.stringify(obj, null, 2), 'utf8');
        fs.unlinkSync(src);
        const audit = { audit_id: `AUD-${Date.now()}`, type: 'lead_ingest', file: f, name: obj.name };
        ctx.log({ agent: module.exports.name, action: 'processed', audit });
      }
    } catch (err) {
      ctx.log({ agent: module.exports.name, error: String(err) });
    }
  }
};
