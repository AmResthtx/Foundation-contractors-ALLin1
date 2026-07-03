// Basic test harness placeholder. Full tests will be added in later commits.
'use strict';

const fs = require('fs');
const path = require('path');

console.log('hermes/test.js — starting basic checks');

// Node.js version check
const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
if (isNaN(nodeMajor) || nodeMajor < 18) {
  console.error('Node >= 18 is required. Found', process.version);
  process.exit(2);
}
console.log('node version OK', process.version);

// Ensure data directory exists (tests will create more when implemented)
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  console.log('creating data directory for tests:', dataDir);
  fs.mkdirSync(dataDir, { recursive: true });
}

console.log('basic checks passed');
process.exit(0);
