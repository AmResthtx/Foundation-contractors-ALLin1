'use strict';

// Shared Anthropic Messages API helper. Every agent that needs a model call
// goes through here so the request shape (headers, max_tokens) and response
// parsing only need to be right in one place.
//
// Returns the extracted text on success. Throws on missing key, non-2xx, or
// a response shape it doesn't recognize — callers decide what "no answer"
// means for their own gate/fallback logic; this module never fabricates one.

const MODEL = 'claude-sonnet-5';
const API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

async function callAnthropic(prompt, opts = {}) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    const err = new Error('no_anthropic_key');
    err.code = 'NO_KEY';
    throw err;
  }
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: opts.model || MODEL,
      max_tokens: opts.maxTokens || 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    throw new Error(`anthropic_err:${res.status}:${bodyText.slice(0, 300)}`);
  }
  const json = await res.json();
  const block = Array.isArray(json.content) ? json.content.find((b) => b.type === 'text') : null;
  if (!block || typeof block.text !== 'string') {
    throw new Error(`anthropic_unexpected_response:${JSON.stringify(json).slice(0, 300)}`);
  }
  return block.text;
}

// Best-effort JSON extraction from a model text response (handles the model
// wrapping JSON in prose or a ```json fence, which happens even with a
// direct "respond with JSON" instruction).
function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const objMatch = candidate.match(/\{[\s\S]*\}/);
  if (!objMatch) return null;
  try {
    return JSON.parse(objMatch[0]);
  } catch (_e) {
    return null;
  }
}

module.exports = { callAnthropic, extractJson, MODEL };
