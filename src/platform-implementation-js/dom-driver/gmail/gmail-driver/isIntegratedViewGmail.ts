import type SelectorRegistry from '../../../lib/dom/selectorRegistry';

/**
 * As of writing, @returns true when either Google Chat or Google Meet or both are enabled.
 * @see https://support.google.com/mail/answer/11555490
 */
export default function isIntegratedViewGmail(
  selectors: SelectorRegistry,
): boolean {
  const nav = selectors.querySelectorByKey(document, 'appMenu.firstItem');
  return nav != null;
}

/** @returns null if the app menu (left side menu containing Mail, Chat/Spaces, and Meet) is configured off */
export function isCollapsiblePanelHidden(
  selectors: SelectorRegistry,
): boolean | null {
  if (!isIntegratedViewGmail(selectors)) {
    return null;
  }

  return selectors.querySelectorByKey(document, 'appMenu.collapsedNav') != null;
}

export function isGoogleChatEnabled(selectors: SelectorRegistry) {
  return selectors.querySelectorByKey(document, 'appMenu.chatItem') != null;
}
