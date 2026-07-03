const fs = require('fs');
const path = require('path');

function readSources() {
  const srcFile = path.join(__dirname, '..', 'research', 'sources.md');
  if (!fs.existsSync(srcFile)) return { sources: [], prj: [] };
  const raw = fs.readFileSync(srcFile, 'utf8');
  const ids = [];
  const prj = [];
  const re = /SRC-\d+/g;
  let m;
  while ((m = re.exec(raw)) !== null) ids.push(m[0]);
  const prjRe = /PRJ-\d+/g;
  while ((m = prjRe.exec(raw)) !== null) prj.push(m[0]);
  return { sources: Array.from(new Set(ids)), prj: Array.from(new Set(prj)) };
}

module.exports = {
  name: 'automation-governance',
  intervalMs: 1000 * 60 * 60 * 24,
  staleAfterMs: 1000 * 60 * 60 * 24 * 7,
  validateSources(claims) {
    // claims: array of SRC-### strings
    const { sources, prj } = readSources();
    const results = { ok: [], missing: [], blocked: [] };
    for (const c of (claims || [])) {
      if (prj.includes(c)) results.blocked.push(c);
      else if (sources.includes(c)) results.ok.push(c);
      else results.missing.push(c);
    }
    return results;
  },
  generateAuditId() {
    return `AUD-${Date.now()}-${Math.floor(Math.random()*1000)}`;
  },
  needsEngineerReview(text) {
    const civ = require('./civil-engineer');
    return civ.isStructuralClaim(text);
  }
};
