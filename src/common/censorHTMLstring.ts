export const ATTRIBUTE_WHITELIST: Set<string> = new Set([
  // standard html props
  'class',
  'rel',
  'target',
  'type',
  'tabindex',
  'id',
  'style',
  'role',
  'contenteditable',
  'aria-expanded',
  'aria-hidden',
  'aria-disabled',
  'aria-haspopup',
  'aria-labelledby',
  'aria-busy',
  'aria-multiselectable',
  // inbox props
  'data-action-data',
  'data-item-id',
  'data-msg-id',
  'data-map-id',
  'g_editable',
  'jsnamespace',
  'jsaction'
]);

// Takes an HTML string, and returns it with all of the text nodes and
// attribute values censored.
// When we fail to parse data out of Gmail's HTML, we can use this function and
// then log the censored HTML so we know we aren't logging user data.
export default function censorHTMLstring(html: string): string {
  return html
    .replace(
      /(^|>)([^<]+)/g,
      (match: string, start: string, text: string) =>
        start + (text.trim().length ? '...' : '')
    )
    .replace(/\s([^\s=]+)\s*=\s*"[^"]+"/g, (match: string, attr: string) =>
      ATTRIBUTE_WHITELIST.has(attr) ? match : ` ${attr}="..."`
    );
}
