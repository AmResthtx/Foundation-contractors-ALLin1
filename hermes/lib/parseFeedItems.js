'use strict';

// Tolerant RSS 2.0 / Atom feed item parser. Takes a raw XML string, returns
// an array of { title, link, date }. Used by the local/statewide feed
// watcher agents; deliberately regex-based (no XML dep) since feeds are
// well-formed enough in practice and this avoids adding a parser dependency.
function parseFeedItems(xml) {
  if (typeof xml !== 'string') return [];
  const items = [];
  const blocks = xml.match(/<(?:item|entry)[\s>][\s\S]*?<\/(?:item|entry)>/gi) || [];
  for (const block of blocks) {
    const pick = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
    };
    const linkAttr = block.match(/<link[^>]*href="([^"]+)"/i); // Atom-style
    const link = pick('link') || (linkAttr ? linkAttr[1] : '');
    const title = pick('title');
    if (title && link) items.push({ title, link, date: pick('pubDate') || pick('updated') });
  }
  return items;
}

module.exports = { parseFeedItems };
