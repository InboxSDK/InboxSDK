/* @flow */

// Quick function for converting HTML with entities into text without
// introducing an XSS vulnerability.
export default function htmlToText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html.replace(/<[^>]*>?/g, '');
  return div.textContent;
}
