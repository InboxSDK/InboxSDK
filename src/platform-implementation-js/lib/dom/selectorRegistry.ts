import {
  GMAIL_SELECTORS,
  type SelectorCandidates,
  type SelectorKey,
  type SelectorOverrides,
} from '../../dom-driver/gmail/selectors';
import mergeSelectorOverrides, {
  type InvalidSelectorReporter,
} from './mergeSelectorOverrides';
import { SelectorError } from './querySelectorOrFail';

export type SelectorRegistryOptions = {
  /** Additional selector candidates to PREPEND to the SDK bundled defaults. */
  overrides?: SelectorOverrides;
  /** Fires for each override candidate dropped as invalid CSS in THIS browser. */
  onInvalidSelector?: InvalidSelectorReporter;
};

/**
 * Install overrides into the bundled defaults, filtering out invalid
 * selectors. If there are any errors merging the overrides, we fallback
 * to the SDK bundled defaults.
 */
function mergeOrFallBack({
  overrides,
  onInvalidSelector,
}: SelectorRegistryOptions): SelectorCandidates {
  if (!overrides) {
    return GMAIL_SELECTORS;
  }

  try {
    return mergeSelectorOverrides(
      GMAIL_SELECTORS,
      overrides,
      onInvalidSelector,
    );
  } catch {
    return GMAIL_SELECTORS;
  }
}

/**
 * Resolves named keys to elements, trying each of the key's candidates in
 * order. Owned by the GmailDriver, so each InboxSDK instance resolves against
 * its own candidates and a registry is never read before it is built.
 */
export default class SelectorRegistry {
  readonly #candidates: SelectorCandidates;

  constructor(options: SelectorRegistryOptions = {}) {
    this.#candidates = mergeOrFallBack(options);
  }

  /**
   * Resolve a registry key against `el`, returning null on a miss. Use this
   * method if you want to degrade functionality when a selector is missing,
   * instead of throwing an error.
   */
  querySelectorByKey(
    el: Document | DocumentFragment | Element,
    key: SelectorKey,
  ): HTMLElement | null {
    // Try each candidate in order, returning the first match (null otherwise).
    for (const candidateSelector of this.#candidates[key]) {
      const found = el.querySelector<HTMLElement>(candidateSelector);
      if (found) {
        return found;
      }
    }

    return null;
  }

  /**
   * Resolve a registry key against `el`, but throws if no candidate matches.
   */
  querySelectorByKeyOrFail(
    el: Document | DocumentFragment | Element,
    key: SelectorKey,
  ): HTMLElement {
    const found = this.querySelectorByKey(el, key);
    if (!found) {
      throw new SelectorError(`${key} (${this.#candidates[key].join(' || ')})`);
    }
    return found;
  }
}
