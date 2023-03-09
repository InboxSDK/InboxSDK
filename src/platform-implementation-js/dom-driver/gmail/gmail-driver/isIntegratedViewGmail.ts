/**
 * https://support.google.com/mail/answer/11555490
 */
export default function isIntegratedViewGmail(): boolean {
  const nav = document.querySelector('div[role=navigation]');
  return Boolean(nav?.firstElementChild?.classList.contains('Xa'));
}

/** @returns null if the app menu is configured off */
export function isCollapsiblePanelHidden(): boolean | null {
  if (!isIntegratedViewGmail()) {
    return null;
  }

  return document.querySelector('div[role=navigation].aBA') != null;
}
