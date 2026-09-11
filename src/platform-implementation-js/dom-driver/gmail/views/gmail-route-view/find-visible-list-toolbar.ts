import type SelectorRegistry from '../../../../lib/dom/selectorRegistry';

/**
 * Gmail keeps the wrappers of views you have visited as hidden siblings,
 * toolbar included, so the first wrapper in the DOM is often a stale one.
 */
export default function findVisibleListToolbar(
  main: HTMLElement,
  selectors: SelectorRegistry,
): HTMLElement | null {
  const wrappers = selectors.querySelectorAllByKey(
    main,
    'routeView.rowListWrapper',
  );
  const visibleWrapper = wrappers.find(isDisplayed);
  if (!visibleWrapper) {
    return null;
  }
  return selectors.querySelectorByKey(visibleWrapper, 'routeView.listToolbar');
}

function isDisplayed(el: HTMLElement): boolean {
  return getComputedStyle(el).display !== 'none';
}
