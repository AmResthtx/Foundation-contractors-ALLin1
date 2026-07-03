const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'heartbeat',
  intervalMs: 60_000,
  staleAfterMs: 5 * 60_000,
  run(ctx) {
    fs.writeFileSync(path.join(ctx.dataDir, 'heartbeat'), new Date().toISOString());
  },
};
