const { feedsFromEnv, watchFeeds } = require('../lib/feed-watch');

// backlog R-5: local RSS/Atom feeds, no auth required. Context in
// hermes/research/local-monitoring.md.
const LOCAL_FEEDS = feedsFromEnv('LOCAL_FEEDS', [
  'https://hgsubsidence.org/feed/', // Harris-Galveston Subsidence District (SRC-030)
  'https://www.houstonpublicmedia.org/topics/environment/feed/|https://www.houstonpublicmedia.org/feed/', // Houston Public Media (SRC-044)
]);

// Titles matching this trigger an alert — events that make helical piers
// timely (POLICIES.md Policy 3).
const LOCAL_URGENT_RE = /sinkhole|subsidence|foundation|collapse|ground\s*fail|settlement/i;

module.exports = {
  name: 'local-monitoring',
  intervalMs: 24 * 3_600_000,
  staleAfterMs: 3 * 24 * 3_600_000,
  run(ctx) {
    return watchFeeds('local-monitoring', LOCAL_FEEDS, LOCAL_URGENT_RE, ctx);
  },
};
