const fs = require('fs');
const path = require('path');

// Industry Monitor, steel prices (POLICIES.md Policy 3).
// Series tracked in hermes/research/steel-alloys.md (SRC-020/021).
// fredgraph.csv needs no API key; swap to the keyed FRED API if it ever
// rate-limits or breaks (backlog R-10).
const PPI_SERIES = ['WPU101704', 'PCU33123312'];

async function checkSeries(id, dataDir, ctx, alertPct) {
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

  const stateFile = path.join(dataDir, `ppi-${id}.json`);
  const seenDate = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')).lastDate : null;
  if (seenDate === lastDate) return; // no new observation since last check

  const pct = ((last - prev) / prev) * 100;
  fs.writeFileSync(stateFile, JSON.stringify({ lastDate, value: last, prevDate, prevValue: prev, pct }, null, 2));
  ctx.log({ agent: 'steel-ppi', message: `${id} ${lastDate}: ${last} (${pct.toFixed(2)}% vs ${prevDate})` });
  if (Math.abs(pct) >= alertPct) {
    ctx.alert({
      agent: 'steel-ppi',
      message: `Steel PPI ${id} moved ${pct.toFixed(2)}% MoM (${prevDate} -> ${lastDate}: ${prev} -> ${last}). Review procurement impact.`,
    });
  }
}

module.exports = {
  name: 'steel-ppi',
  intervalMs: 24 * 3_600_000,
  staleAfterMs: 3 * 24 * 3_600_000,
  async run(ctx) {
    const alertPct = Number(process.env.PPI_ALERT_PCT || 5);
    for (const id of PPI_SERIES) {
      await checkSeries(id, ctx.dataDir, ctx, alertPct);
    }
  },
};
