/* @flow */
//jshint ignore:start

var ATTRIBUTE_WHITELIST = new Set([
  "class", "rel", "target", "aria-hidden", "type", "tabindex", "id",
  "style", "role"
]);

// Takes an HTML string, and returns it with all of the text nodes and
// attribute values censored.
// When we fail to parse data out of Gmail's HTML, we can use this function and
// then log the censored HTML so we know we aren't logging user data.
export default function censorHTMLstring(html: string): string {
  return html.replace(/(^|>)([^<]+)/g, (((match: string, start: string, text: string) =>
    start + (text.trim().length ? '...' : '')
  ): Function)).replace(/\s([^\s=]+)\s*=\s*"[^"]+"/g, (((match: string, attr: string) =>
    ATTRIBUTE_WHITELIST.has(attr) ? match : ` ${attr}="..."`
  ): Function));
}
