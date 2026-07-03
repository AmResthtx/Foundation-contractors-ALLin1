const fs = require('fs');
const path = require('path');

// Simple feed parser used by tests and other agents
module.exports.parseFeedItems = function(items) {
  if (!Array.isArray(items)) return [];
  return items.map((it) => {
    if (typeof it === 'string') return { id: it, text: it };
    if (it && it.id) return { id: String(it.id), text: it.text || '' };
    return { id: JSON.stringify(it), text: '' };
  });
};
