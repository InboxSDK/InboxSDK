import type SelectorRegistry from '../../../../lib/dom/selectorRegistry';
import findVisibleListToolbar from './find-visible-list-toolbar';

/**
 * Gmail hides or deletes the wrapper of the list you leave, and every list route
 * reuses one container. Returns false when it falls back to the top of `main`.
 */
export default function placeSectionsContainer(
  main: HTMLElement,
  sectionsContainer: HTMLElement,
  selectors: SelectorRegistry,
): boolean {
  const listToolbar = findVisibleListToolbar(main, selectors);

  if (listToolbar) {
    if (listToolbar.nextSibling !== sectionsContainer) {
      listToolbar.after(sectionsContainer);
    }
    return true;
  }

  if (main.firstChild !== sectionsContainer) {
    main.prepend(sectionsContainer);
  }
  return false;
}
