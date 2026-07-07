import { SelectorError } from './querySelectorOrFail';

/**
 * Like `querySelectorOrFail`, but tries each selector in order and returns the
 * first match. Throws a `SelectorError` (listing all attempted selectors) only
 * if none match.
 *
 * This exists because Gmail periodically A/B-tests DOM variants that rename
 * generated class tokens (e.g. the compose title-bar `table.cf.Ht` becomes
 * `table.cf.Ht-<hash>`). Passing the classic selector first followed by a
 * token-agnostic structural fallback lets a single code path support both DOMs
 * without regressing the classic one.
 */
export default function querySelectorWithFallbacks(
  el: Document | DocumentFragment | Element,
  selectors: string[],
): HTMLElement {
  for (const selector of selectors) {
    const r = el.querySelector(selector);
    if (r) return r as HTMLElement;
  }
  throw new SelectorError(selectors.join(', '));
}
