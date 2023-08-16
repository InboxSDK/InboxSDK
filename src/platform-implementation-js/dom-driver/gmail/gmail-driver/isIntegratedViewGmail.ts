/**
 * There's three cases this function should return true:
    - The user is in a pre-Google-Chat Hangouts-only version of Gmail (the Gmail Settings ->
    Chat and Meet -> Chat menu only has the options "Hangouts On" and "Hangouts Off").
    - The user has "Classic Hangouts" picked in Gmail Settings -> Chat and Meet -> Chat.
    - Integrated view gmail.
 * @see https://support.google.com/mail/answer/11555490
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
