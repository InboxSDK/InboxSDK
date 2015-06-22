/* @flow */
//jshint ignore:start

// Takes an HTML string, and returns it with all of the text nodes and
// attribute values censored.
export default function censorHTMLstring(html: string): string {
  return html.replace(/(^|>)([^<]+)/g, (((match: string, start: string, text: string) =>
    start + (text.trim().length ? '...' : '')
  ): Function)).replace(/"[^"]+"/g, '"..."').replace(/'[^']+'/g, "'...'");
}
