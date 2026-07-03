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

module.exports = {
  name: 'reality-checker',
  intervalMs: 1000 * 60 * 60 * 24,
  staleAfterMs: 1000 * 60 * 60 * 24 * 7,
  async critiqueAgainstKb(draft, citedText, ctx) {
    // If Anthropic key present, use it to critique; otherwise use simple heuristic
    if (process.env.KB_STRESS_TEST_MODE === 'true' && process.env.ANTHROPIC_API_KEY) {
      try {
        const prompt = `Critique this draft for contradictions against the KB text. KB: ${citedText}\nDRAFT: ${draft}\nRespond JSON {contradiction: bool, notes:[string]}`;
        const r = await callAnthropic(prompt);
        return { pass: true, raw: r };
      } catch (e) {
        ctx.log({ agent: module.exports.name, error: String(e) });
        return { pass: false, reason: 'anthropic_error' };
      }
    }
    // fallback heuristic: ensure no sentence in draft contains a negation of a short KB phrase
    const kbPhrases = citedText.split(/\.|;|\n/).map(s=>s.trim()).filter(Boolean).slice(0,10);
    const draftLower = (draft || '').toLowerCase();
    for (const p of kbPhrases) {
      const phrase = p.toLowerCase();
      if (!phrase) continue;
      // crude check: if draft contains "not <phrase>" or "no <phrase>", flag
      if (draftLower.includes('not ' + phrase) || draftLower.includes('no ' + phrase)) {
        return { pass: false, reason: `contradicts phrase: ${phrase}` };
      }
    }
    return { pass: true, reason: 'heuristic_pass' };
  }
};
