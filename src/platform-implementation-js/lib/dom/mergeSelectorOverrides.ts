import uniq from 'lodash/uniq';

/**
 * Unmounted fragment, used to validate CSS selectors.
 */
let validationRoot: DocumentFragment | undefined;

/**
 * Check whether the given selector is valid.
 */
export function isValidSelector(selector: string): boolean {
  if (!validationRoot) {
    validationRoot = document.createDocumentFragment();
  }

  try {
    validationRoot.querySelector(selector);
    return true;
  } catch {
    return false;
  }
}

/** Called for each dropped candidate: silent to the user, loud to the operator. */
export type InvalidSelectorReporter = (key: string, selector: string) => void;

/**
 * Merges two selector registry objects (defaults and overrides),
 * filtering out invalid selectors from the overrides. If found,
 * it prepends the valid overrides to the defaults.
 *
 * @example
 * ```ts
 * mergeSelectorOverrides(
 *   { 'composeView.someKey': ['.foo'] },
 *   { 'composeView.someKey': ['.bar', 'invalid selector'] }
 * );
 * // { 'composeView.someKey': ['.bar', '.foo'] }
 * ```
 */
export default function mergeSelectorOverrides<K extends string>(
  defaults: Record<K, readonly string[]>,
  overrides: Partial<Record<K, readonly string[]>>,
  onInvalid?: InvalidSelectorReporter,
): Record<K, readonly string[]> {
  const merged = {} as Record<K, readonly string[]>;

  for (const key of Object.keys(defaults) as K[]) {
    const extra = (overrides[key] ?? []).filter((selector) => {
      if (isValidSelector(selector)) {
        return true;
      }

      onInvalid?.(key, selector);
      return false;
    });

    merged[key] = uniq([...extra, ...defaults[key]]);
  }

  return merged;
}
