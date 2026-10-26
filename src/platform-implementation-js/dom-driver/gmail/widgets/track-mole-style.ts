import { MOLE_CONTAINER_SELECTOR } from '../gmail-element-getter';

/** Follow the account's actual rollout, including native moles opened after an SDK mole. */
export default function trackMoleStyle(moleParent: HTMLElement): void {
  const container = moleParent.closest(MOLE_CONTAINER_SELECTOR);
  if (!container) return;

  const update = () => {
    const roundedCompose = moleParent.querySelector('.Hd.rT5Apb');
    const roundedChat = [
      ...moleParent.querySelectorAll('iframe.dB.Ca12td'),
    ].some((frame) => getComputedStyle(frame).borderTopLeftRadius === '20px');
    if (!roundedCompose && !roundedChat) return false;
    // Keep the style after the last native compose is closed.
    container.classList.add('inboxsdk__rounded_moles');
    return true;
  };
  if (update()) return;

  const observer = new MutationObserver(() => {
    if (update()) observer.disconnect();
  });
  observer.observe(moleParent, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });
}
