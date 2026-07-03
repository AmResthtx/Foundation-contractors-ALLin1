const fs = require('fs');
const path = require('path');

async function callAnthropic(prompt) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('no_anthropic_key');
  const fetch = global.fetch || require('node-fetch');
  const body = { messages: [{ role: 'user', content: prompt }], model: 'claude-sonnet-5' };
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': key },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`anthropic_err:${res.status}`);
  const json = await res.json();
  return json;
}

function fallbackScore(message) {
  const txt = (message || '').toLowerCase();
  const keywords = ['sinkhole','sagging','cracked slab','water intrusion','leaning','urgent','immediately','collapsed'];
  let score = 20;
  for (const k of keywords) if (txt.includes(k)) score += 20;
  if (txt.includes('please') || txt.includes('help')) score += 5;
  if (score > 100) score = 100;
  return { score, reasons: ['rule-based keyword scoring used'] };
}

module.exports = {
  name: 'lead-scorer',
  intervalMs: 1000 * 60 * 2, // every 2 minutes
  staleAfterMs: 1000 * 60 * 60 * 24,
  async run(ctx) {
    const processed = path.join(process.cwd(), 'data', 'leads-processed');
    if (!fs.existsSync(processed)) return ctx.log({ agent: module.exports.name, message: 'no leads to score' });
    const files = fs.readdirSync(processed).filter(f => f.endsWith('.json'));
    for (const f of files) {
      const full = path.join(processed, f);
      try {
        const obj = JSON.parse(fs.readFileSync(full, 'utf8'));
        let result;
        try {
          // try Anthropic first, but fallback to rule-based scoring if not available
          if (process.env.ANTHROPIC_API_KEY) {
            const prompts = require('../research/prompts');
            const prompt = `Score this lead using rubric:\n${JSON.stringify(obj)}\n`; 
            const r = await callAnthropic(prompt);
            // best-effort parse
            result = { score: r?.completion?.score || 0, reasons: [JSON.stringify(r?.completion || r).slice(0,200)] };
            ctx.log({ agent: module.exports.name, method: 'anthropic', file: f });
          } else {
            throw new Error('no_key');
          }
        } catch (e) {
          result = fallbackScore(obj.message);
          ctx.log({ agent: module.exports.name, method: 'fallback', file: f, reason: String(e) });
        }

        // append reasoning to audit and write a scored file
        const scored = Object.assign({}, obj, { score: result.score, reasoning: result.reasons, scored_at: new Date().toISOString() });
        const scoredDir = path.join(process.cwd(), 'data', 'leads-scored');
        fs.mkdirSync(scoredDir, { recursive: true });
        fs.writeFileSync(path.join(scoredDir, f), JSON.stringify(scored, null, 2), 'utf8');
        // remove original
        fs.unlinkSync(full);
        ctx.log({ agent: module.exports.name, action: 'scored', file: f, score: result.score });
        if (result.score >= 70) {
          // HOT lead
          ctx.alert({ type: 'hot_lead', file: f, score: result.score, contact: obj.contact });
          // create reminder file for 24h dispatch
          const reminders = path.join(process.cwd(), 'data', 'leads-reminders');
          fs.mkdirSync(reminders, { recursive: true });
          const reminder = Object.assign({}, scored, { remind_at: new Date(Date.now() + 24*60*60*1000).toISOString() });
          fs.writeFileSync(path.join(reminders, f), JSON.stringify(reminder, null, 2), 'utf8');
        }
      } catch (err) {
        ctx.log({ agent: module.exports.name, error: String(err), file: f });
      }
    }
  }
};
