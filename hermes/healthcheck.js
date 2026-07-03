// Docker HEALTHCHECK probe: healthy iff the heartbeat file was touched
// within the last 5 minutes. The daemon's own watchdog does the restarting;
// this just makes `docker ps` show the truth.
'use strict';

const fs = require('fs');
const path = require('path');

const HEARTBEAT_FILE = path.join(process.env.DB_PATH || './data', 'heartbeat');
const MAX_AGE_MS = 5 * 60_000;

try {
  const age = Date.now() - fs.statSync(HEARTBEAT_FILE).mtimeMs;
  process.exit(age <= MAX_AGE_MS ? 0 : 1);
} catch {
  process.exit(1);
}
