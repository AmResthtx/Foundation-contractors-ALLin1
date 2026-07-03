module.exports = {
  name: 'prompt-engineer',
  intervalMs: 1000 * 60 * 60 * 24, // runs daily by default
  staleAfterMs: 1000 * 60 * 60 * 24 * 7,
  run(ctx) {
    // Lightweight: do not call Anthropic here. Provide prompt templates and
    // a helper function other agents can require. Log start and version.
    try {
      const p = require('../research/prompts');
      ctx.log({ agent: module.exports.name, message: 'prompt-engineer loaded', promptCount: Object.keys(p).length });
    } catch (e) {
      ctx.log({ agent: module.exports.name, error: String(e) });
    }
  },
  // helper exported for other modules that require this agent file
  getPrompt(name) {
    try {
      const prompts = require('../research/prompts');
      return prompts[name] || null;
    } catch (e) {
      return null;
    }
  }
};
