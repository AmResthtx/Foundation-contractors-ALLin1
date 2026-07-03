const fs = require('fs');
const path = require('path');

// backlog R-11: Dallas Fed Texas Manufacturing Outlook Survey headline index
// (SRC-043). This is a DIFFUSION index, not a price level — alert on sign
// flips or a large absolute point move, never on percent change (a move from
// +1 to +2 is a 100% change but means almost nothing; a flip from +2 to -2
// is the signal that matters).
const SERIES_ID = 'BACTSAMFRBDAL';

function tmosSignFlip(oldVal, newVal, alertPoints) {
  return Math.sign(oldVal) !== Math.sign(newVal) || Math.abs(newVal - oldVal) >= alertPoints;
}

module.exports = {
  name: 'tmos',
  intervalMs: 24 * 3_600_000,
  staleAfterMs: 3 * 24 * 3_600_000,
  tmosSignFlip,
  async run(ctx) {
    const alertPoints = Number(process.env.TMOS_ALERT_POINTS || 10);
    const res = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${SERIES_ID}`, {
      headers: { 'user-agent': 'hermes-industry-monitor/0.1 (foundation contractor procurement tracking)' },
    });
    if (!res.ok) throw new Error(`FRED ${SERIES_ID}: HTTP ${res.status}`);
    const rows = (await res.text())
      .trim()
      .split('\n')
      .slice(1)
      .map((line) => line.split(','))
      .filter(([, value]) => value && value !== '.');
    if (rows.length < 2) throw new Error(`FRED ${SERIES_ID}: fewer than 2 observations`);

    const [prevDate, prevRaw] = rows[rows.length - 2];
    const [lastDate, lastRaw] = rows[rows.length - 1];
    const prev = Number(prevRaw);
    const last = Number(lastRaw);

    const stateFile = path.join(ctx.dataDir, `tmos-${SERIES_ID}.json`);
    const prior = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : null;
    if (prior && prior.lastDate === lastDate) return; // no new observation

    fs.writeFileSync(stateFile, JSON.stringify({ lastDate, last_month: last, prevDate, prevValue: prev }, null, 2));
    ctx.log({ agent: 'tmos', message: `${SERIES_ID} ${lastDate}: ${last} (prior ${prevDate}: ${prev})` });

    // Silent seed on first sight — no baseline to compare against yet.
    if (!prior) return;

    if (tmosSignFlip(prior.last_month, last, alertPoints)) {
      ctx.alert({
        agent: 'tmos',
        message: `TMOS headline index moved from ${prior.last_month} to ${last} (${prevDate} -> ${lastDate}) — sign flip or move >= ${alertPoints} pts. Review Texas manufacturing outlook impact on procurement demand.`,
      });
    }
  },
};
