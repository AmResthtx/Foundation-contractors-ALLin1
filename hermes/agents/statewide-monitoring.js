const { feedsFromEnv, watchFeeds } = require('../lib/feed-watch');

// backlog R-5/statewide tier: Texas-wide feeds. Narrower alert keywords than
// local-monitoring since these are higher-volume general feeds — broad
// keywords would be pure noise. Context in
// hermes/research/statewide-monitoring.md.
const STATEWIDE_FEEDS = feedsFromEnv('STATEWIDE_FEEDS', [
  'https://feeds.texastribune.org/feeds/main/', // Texas Tribune main (SRC-040)
  'https://www.sos.state.tx.us/texreg/texreg.xml', // Texas Register weekly (SRC-045)
]);

const STATEWIDE_URGENT_RE = /sinkhole|subsidence|foundation|expansive\s*(clay|soil)/i;

module.exports = {
  name: 'statewide-monitoring',
  intervalMs: 24 * 3_600_000,
  staleAfterMs: 3 * 24 * 3_600_000,
  run(ctx) {
    return watchFeeds('statewide-monitoring', STATEWIDE_FEEDS, STATEWIDE_URGENT_RE, ctx);
  },
};
