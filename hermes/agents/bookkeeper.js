module.exports = {
  name: 'bookkeeper',
  intervalMs: 1000 * 60 * 60 * 24, // daily
  staleAfterMs: 1000 * 60 * 60 * 24 * 7,
  run(ctx) {
    // lightweight bookkeeping operations: no external connections, append-only ledger
    try {
      const fs = require('fs');
      const path = require('path');
      const ledgerDir = path.join(process.cwd(), 'data', 'bookkeeper');
      if (!fs.existsSync(ledgerDir)) fs.mkdirSync(ledgerDir, { recursive: true });
      const ledgerFile = path.join(ledgerDir, 'ledger.jsonl');
      // housekeeping: ensure file exists
      if (!fs.existsSync(ledgerFile)) fs.writeFileSync(ledgerFile, '', { encoding: 'utf8' });
      ctx.log({ agent: module.exports.name, message: 'bookkeeper ready', ledgerFile });
    } catch (e) {
      ctx.log({ agent: module.exports.name, error: String(e) });
    }
  },
  // append an entry {type, amount, category, notes, ts}
  appendEntry(entry) {
    try {
      const fs = require('fs');
      const path = require('path');
      const ledgerDir = path.join(process.cwd(), 'data', 'bookkeeper');
      if (!fs.existsSync(ledgerDir)) fs.mkdirSync(ledgerDir, { recursive: true });
      const ledgerFile = path.join(ledgerDir, 'ledger.jsonl');
      const e = Object.assign({ ts: new Date().toISOString() }, entry || {});
      fs.appendFileSync(ledgerFile, JSON.stringify(e) + '\n', { encoding: 'utf8' });
      return e;
    } catch (err) {
      throw err;
    }
  }
};
