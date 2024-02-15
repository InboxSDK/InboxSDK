import { sanitize } from 'dompurify';

// https://developer.mozilla.org/en-US/docs/Web/API/TrustedHTML
// TS doesn't ship types for trustedTypes yet, so we'll use any for now.
// Safari 17 doesn't support it either, so fallback if it's not defined.
const escapeHTMLPolicy = (globalThis as any).trustedTypes?.createPolicy(
  'inboxSdkEscapePolicy',
  {
    createHTML: (string: string) => sanitize(string),
  },
) ?? {
  createHTML(string: string) {
    return sanitize(string);
  },
};

/**
 * Quick function for converting HTML with entities into text without
 * introducing an XSS vulnerability.
 */
export default function htmlToText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = escapeHTMLPolicy.createHTML(html);
  return div.textContent!;
}
