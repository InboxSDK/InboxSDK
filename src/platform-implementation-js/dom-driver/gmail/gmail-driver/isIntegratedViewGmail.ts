/**
 * As of writing, @returns true when either Google Chat or Google Meet or both are enabled.
 * @see https://support.google.com/mail/answer/11555490
 */
export default function isIntegratedViewGmail(): boolean {
  const nav = document.querySelector('div[role=navigation] > :nth-child(1).Xa');
  return nav != null;
}

/** @returns null if the app menu (left side menu containing Mail, Chat/Spaces, and Meet) is configured off */
export function isCollapsiblePanelHidden(): boolean | null {
  if (!isIntegratedViewGmail()) {
    return null;
  }

  return document.querySelector('div[role=navigation].aBA') != null;
}

/**
 * @note only able to @return true when @see {isIntegratedViewGmail} returns true
 */
export function isGoogleChatEnabled() {
  return document.querySelector('div[role=navigation] > .ao4') != null;
}
