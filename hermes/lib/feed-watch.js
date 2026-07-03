'use strict';

const fs = require('fs');
const path = require('path');
const { parseFeedItems } = require('./parseFeedItems');

const SEEN_CAP = 200;

function feedsFromEnv(envVar, defaults) {
  return (process.env[envVar] || defaults.join(','))
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
}

// Fetch one source, trying each pipe-separated candidate URL until one
// fetches and parses. Returns { feedUrl, items }; throws with per-candidate
// diagnostics if all fail.
async function fetchFeed(candidates) {
  const errors = [];
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; HermesMonitor/0.1)',
          accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.text();
      const items = parseFeedItems(body);
      if (items.length === 0) {
        const ct = res.headers.get('content-type') || 'unknown';
        throw new Error(`no items parsed (content-type ${ct}; starts: ${JSON.stringify(body.slice(0, 120))})`);
      }
      return { feedUrl: url, items };
    } catch (err) {
      errors.push(`${url} -> ${err.message}`);
    }
  }
  throw new Error(errors.join(' | '));
}

// Comma separates sources; a pipe `|` separates fallback candidates for one
// source (first that fetches AND parses wins). First sight of a feed seeds
// state silently — no alert storm on a feed's back-catalog.
async function watchFeeds(scope, feeds, urgentRe, ctx) {
  const stateFile = path.join(ctx.dataDir, 'feeds-seen.json');
  const seen = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : {};
  let feedFailures = 0;

  for (const source of feeds) {
    const candidates = source.split('|').map((u) => u.trim()).filter(Boolean);
    try {
      const { feedUrl, items } = await fetchFeed(candidates);

      const firstSight = !seen[feedUrl];
      const known = new Set(seen[feedUrl] || []);
      for (const item of items) {
        if (known.has(item.link)) continue;
        known.add(item.link);
        if (firstSight) continue;
        ctx.log({ agent: scope, message: `new item: "${item.title}" ${item.link}` });
        if (urgentRe.test(item.title)) {
          ctx.alert({
            agent: scope,
            message: `${scope} event watch hit: "${item.title}" (${item.date || 'no date'}) ${item.link} — potential timely-content opportunity per Policy 3. Permission check required before public use.`,
          });
        }
      }
      if (firstSight) {
        ctx.log({ agent: scope, message: `seeded feed ${feedUrl} (${items.length} items)` });
      }
      seen[feedUrl] = [...known].slice(-SEEN_CAP);
    } catch (err) {
      feedFailures++;
      ctx.log({ agent: scope, error: `feed source failed on all candidates: ${err.message}` });
    }
  }

  fs.writeFileSync(stateFile, JSON.stringify(seen, null, 2));
  if (feedFailures === feeds.length && feeds.length > 0) {
    throw new Error(`all ${scope} feeds failed`); // let the runner's failure counter see it
  }
}

module.exports = { feedsFromEnv, watchFeeds };
