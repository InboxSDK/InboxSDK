import { removeHtmlTagsPolicy } from './removeHtmlTags';

/**
 * Converts HTML to unformatted plain text.
 * Works by stripping all HTML tags and converting entities to symbols.
 * Safe to use on arbitrary input.
 *
 * Converts text like `String with <b>html</b> &amp; entities &lt;&gt;` to
 * `String with html & entities <>`.
 *
 * This is *not* for creating "safe HTML" from user input to assign to
 * an element's innerHTML. The result of this function should not be treated
 * as HTML.
 */
export default function htmlToText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = removeHtmlTagsPolicy.createHTML(html);
  return div.textContent!;
}
