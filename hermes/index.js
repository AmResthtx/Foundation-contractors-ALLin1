// Hermes orchestrator — job loop skeleton.
//
// Crash-only design: jobs run on intervals; anything unrecoverable makes the
// process exit non-zero, and the container's restart policy (or the next
// scheduled Actions run) brings it back. Do not try to limp along in a bad
// state — exiting IS the recovery mechanism.
//
// Modes:
//   node hermes/index.js          long-running daemon (Docker)
//   node hermes/index.js --once   run every job once and exit (GitHub Actions)

'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DB_PATH || './data';
const AUDIT_LOG = path.join(DATA_DIR, 'audit.log');
const HEARTBEAT_FILE = path.join(DATA_DIR, 'heartbeat');
const MAX_CONSECUTIVE_FAILURES = 5;

fs.mkdirSync(DATA_DIR, { recursive: true });

// Policy 2: every agent action lands in the audit log.
function log(level, agent, msg) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, agent, msg });
  fs.appendFileSync(AUDIT_LOG, line + '\n');
  console.log(line);
}

// Escalation path (Policy 5): alerts go to the CRM webhook when configured,
// and always to the audit log.
async function alert(agent, msg) {
  log('alert', agent, msg);
  const url = process.env.CRM_WEBHOOK_URL;
  if (url && /^https?:\/\//.test(url)) {
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ source: 'hermes', agent, msg, ts: new Date().toISOString() }),
      });
    } catch (err) {
      log('error', agent, `webhook alert failed: ${err.message}`);
    }
  }
}

// Escalation to Ellis (Policy 4/5): audit log + webhook + email via Web3Forms
// when WEB3FORMS_KEY is set (recipient is configured in the Web3Forms account).
async function escalate(agent, msg) {
  log('escalation', agent, msg);
  await alert(agent, `[ESCALATION] ${msg}`);
  const key = process.env.WEB3FORMS_KEY;
  if (key && key !== 'your_key') {
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          access_key: key,
          subject: `[Hermes escalation] ${agent}`,
          from_name: 'Hermes orchestrator',
          message: msg,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      log('error', agent, `escalation email failed: ${err.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

async function heartbeat() {
  fs.writeFileSync(HEARTBEAT_FILE, new Date().toISOString());
}

// Industry Monitor, steel prices (POLICIES.md Policy 3).
// Series tracked in hermes/research/steel-alloys.md (SRC-020/021).
// fredgraph.csv needs no API key; swap to the FRED API when backlog R-10 lands.
const PPI_SERIES = ['WPU101704', 'PCU33123312'];
const PPI_ALERT_PCT = Number(process.env.PPI_ALERT_PCT || 5);

async function steelPpiCheck() {
  for (const id of PPI_SERIES) {
    const res = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`, {
      headers: { 'user-agent': 'hermes-industry-monitor/0.1 (foundation contractor procurement tracking)' },
    });
    if (!res.ok) throw new Error(`FRED ${id}: HTTP ${res.status}`);
    const rows = (await res.text())
      .trim()
      .split('\n')
      .slice(1) // header
      .map((line) => line.split(','))
      .filter(([, value]) => value && value !== '.');
    if (rows.length < 2) throw new Error(`FRED ${id}: fewer than 2 observations`);

    const [prevDate, prevRaw] = rows[rows.length - 2];
    const [lastDate, lastRaw] = rows[rows.length - 1];
    const prev = Number(prevRaw);
    const last = Number(lastRaw);

    const stateFile = path.join(DATA_DIR, `ppi-${id}.json`);
    const seenDate = fs.existsSync(stateFile)
      ? JSON.parse(fs.readFileSync(stateFile, 'utf8')).lastDate
      : null;
    if (seenDate === lastDate) continue; // no new observation since last check

    const pct = ((last - prev) / prev) * 100;
    fs.writeFileSync(
      stateFile,
      JSON.stringify({ lastDate, value: last, prevDate, prevValue: prev, pct }, null, 2)
    );
    log('info', 'industry-monitor', `${id} ${lastDate}: ${last} (${pct.toFixed(2)}% vs ${prevDate})`);
    if (Math.abs(pct) >= PPI_ALERT_PCT) {
      await alert(
        'industry-monitor',
        `Steel PPI ${id} moved ${pct.toFixed(2)}% MoM (${prevDate} -> ${lastDate}: ${prev} -> ${last}). Review procurement impact.`
      );
    }
  }
}

// Local events watcher (backlog R-5). RSS/Atom feeds, no dependencies:
// a tolerant regex parse is enough for title/link dedup. Watch list context
// lives in hermes/research/local-monitoring.md.
const DEFAULT_FEEDS = [
  'https://hgsubsidence.org/feed/', // Harris-Galveston Subsidence District (SRC-030)
  'https://communityimpact.com/houston/spring-klein/feed/', // local Spring/Klein news
];
const LOCAL_FEEDS = (process.env.LOCAL_FEEDS || DEFAULT_FEEDS.join(','))
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean);
// Titles matching this trigger an alert — events that make helical piers
// timely (POLICIES.md Policy 3).
const URGENT_RE = /sinkhole|subsidence|foundation|collapse|ground\s*fail|settlement/i;
const SEEN_CAP = 200;

function parseFeedItems(xml) {
  const items = [];
  const blocks = xml.match(/<(?:item|entry)[\s>][\s\S]*?<\/(?:item|entry)>/gi) || [];
  for (const block of blocks) {
    const pick = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
    };
    const linkAttr = block.match(/<link[^>]*href="([^"]+)"/i); // Atom-style
    const link = pick('link') || (linkAttr ? linkAttr[1] : '');
    const title = pick('title');
    if (title && link) items.push({ title, link, date: pick('pubDate') || pick('updated') });
  }
  return items;
}

async function localMonitoringCheck() {
  const stateFile = path.join(DATA_DIR, 'feeds-seen.json');
  const seen = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : {};
  let feedFailures = 0;

  for (const feedUrl of LOCAL_FEEDS) {
    try {
      const res = await fetch(feedUrl, {
        headers: { 'user-agent': 'hermes-industry-monitor/0.1 (local events watch)' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const items = parseFeedItems(await res.text());
      if (items.length === 0) throw new Error('no items parsed (feed format changed?)');

      const firstSight = !seen[feedUrl];
      const known = new Set(seen[feedUrl] || []);
      for (const item of items) {
        if (known.has(item.link)) continue;
        known.add(item.link);
        // First sight of a feed seeds state silently — no alert storm on
        // historical items.
        if (firstSight) continue;
        log('info', 'industry-monitor', `new local item: "${item.title}" ${item.link}`);
        if (URGENT_RE.test(item.title)) {
          await alert(
            'industry-monitor',
            `Local event watch hit: "${item.title}" (${item.date || 'no date'}) ${item.link} — potential timely-content opportunity per Policy 3. Permission check required before public use.`
          );
        }
      }
      if (firstSight) {
        log('info', 'industry-monitor', `seeded feed ${feedUrl} (${items.length} items)`);
      }
      seen[feedUrl] = [...known].slice(-SEEN_CAP);
    } catch (err) {
      feedFailures++;
      log('error', 'industry-monitor', `feed ${feedUrl} failed: ${err.message}`);
    }
  }

  fs.writeFileSync(stateFile, JSON.stringify(seen, null, 2));
  if (feedFailures === LOCAL_FEEDS.length && LOCAL_FEEDS.length > 0) {
    throw new Error('all local feeds failed'); // let the runner's failure counter see it
  }
}

const JOBS = [
  { name: 'heartbeat', fn: heartbeat, intervalMs: 60_000, staleAfterMs: 5 * 60_000 },
  { name: 'steel-ppi', fn: steelPpiCheck, intervalMs: 24 * 3_600_000, staleAfterMs: 3 * 24 * 3_600_000 },
  { name: 'local-monitoring', fn: localMonitoringCheck, intervalMs: 24 * 3_600_000, staleAfterMs: 3 * 24 * 3_600_000 },
];

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function runJob(job) {
  try {
    await job.fn();
    job.lastFinish = Date.now();
    job.failures = 0;
  } catch (err) {
    job.failures = (job.failures || 0) + 1;
    log('error', job.name, `failed (${job.failures}x): ${err.message}`);
    if (job.failures >= MAX_CONSECUTIVE_FAILURES) {
      log('fatal', job.name, `exceeded ${MAX_CONSECUTIVE_FAILURES} consecutive failures; exiting for restart`);
      await escalate(job.name, `Job "${job.name}" failed ${MAX_CONSECUTIVE_FAILURES}x in a row (last: ${err.message}). Process is restarting; investigate if this repeats.`);
      process.exit(1);
    }
  }
}

async function runOnce() {
  let failed = false;
  for (const job of JOBS) {
    if (job.name === 'heartbeat') continue;
    try {
      await job.fn();
      log('info', job.name, 'once-mode run complete');
    } catch (err) {
      failed = true;
      log('error', job.name, `once-mode run failed: ${err.message}`);
    }
  }
  process.exit(failed ? 1 : 0);
}

function runDaemon() {
  log('info', 'orchestrator', `starting; jobs: ${JOBS.map((j) => j.name).join(', ')}`);
  for (const job of JOBS) {
    job.lastFinish = Date.now();
    runJob(job);
    setInterval(() => runJob(job), job.intervalMs);
  }

  // Self-watchdog: a hung job stops updating lastFinish; exit so the
  // restart policy replaces the whole process. Docker's HEALTHCHECK only
  // marks the container unhealthy — this is what actually restarts it.
  setInterval(async () => {
    for (const job of JOBS) {
      if (Date.now() - job.lastFinish > job.staleAfterMs) {
        log('fatal', 'orchestrator', `watchdog: job "${job.name}" stale; exiting for restart`);
        await escalate('orchestrator', `Watchdog restart: job "${job.name}" went stale (no completion in ${Math.round(job.staleAfterMs / 3_600_000)}h).`);
        process.exit(1);
      }
    }
  }, 60_000);

  for (const sig of ['SIGTERM', 'SIGINT']) {
    process.on(sig, () => {
      log('info', 'orchestrator', `${sig} received; shutting down cleanly`);
      process.exit(0);
    });
  }
}

process.on('uncaughtException', (err) => {
  log('fatal', 'orchestrator', `uncaught exception: ${err.stack || err.message}`);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  log('fatal', 'orchestrator', `unhandled rejection: ${err && (err.stack || err.message)}`);
  process.exit(1);
});

if (require.main === module) {
  if (process.argv.includes('--once')) {
    runOnce();
  } else {
    runDaemon();
  }
}

module.exports = { parseFeedItems };
