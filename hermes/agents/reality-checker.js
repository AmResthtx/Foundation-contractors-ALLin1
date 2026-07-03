const { callAnthropic, extractJson } = require('../lib/anthropic');

module.exports = {
  name: 'reality-checker',
  intervalMs: 1000 * 60 * 60 * 24,
  staleAfterMs: 1000 * 60 * 60 * 24 * 7,
  async critiqueAgainstKb(draft, citedText, ctx) {
    // If Anthropic key present, use it to critique; otherwise use simple heuristic.
    if (process.env.KB_STRESS_TEST_MODE === 'true' && process.env.ANTHROPIC_API_KEY) {
      try {
        const prompt = `Critique this draft for contradictions against the KB text. KB: ${citedText}\nDRAFT: ${draft}\nRespond with ONLY a JSON object: {"contradiction": boolean, "notes": [string]}`;
        const text = await callAnthropic(prompt);
        const parsed = extractJson(text);
        if (!parsed || typeof parsed.contradiction !== 'boolean') {
          ctx.log({ agent: module.exports.name, error: `unparseable critique response: ${text.slice(0, 200)}` });
          // Can't confirm it's safe — fail closed, don't silently pass.
          return { pass: false, reason: 'critique_unparseable' };
        }
        return { pass: !parsed.contradiction, reason: parsed.contradiction ? 'contradiction_detected' : 'critique_pass', notes: parsed.notes };
      } catch (e) {
        ctx.log({ agent: module.exports.name, error: String(e) });
        return { pass: false, reason: 'anthropic_error' };
      }
    }
    // fallback heuristic: ensure no sentence in draft contains a negation of a short KB phrase
    const kbPhrases = citedText.split(/\.|;|\n/).map((s) => s.trim()).filter(Boolean).slice(0, 10);
    const draftLower = (draft || '').toLowerCase();
    for (const p of kbPhrases) {
      const phrase = p.toLowerCase();
      if (!phrase) continue;
      if (draftLower.includes('not ' + phrase) || draftLower.includes('no ' + phrase)) {
        return { pass: false, reason: `contradicts phrase: ${phrase}` };
      }
    }
    return { pass: true, reason: 'heuristic_pass' };
  },
};
