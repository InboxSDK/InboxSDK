import NativeGmailNavItemView from '../views/native-gmail-nav-item-view';
import GmailElementGetter from '../gmail-element-getter';
import findParent from '../../../../common/find-parent';
import waitFor from '../../../lib/wait-for';

import type GmailDriver from '../gmail-driver';

export default function getNativeNavItem(
  driver: GmailDriver,
  label: string
): Promise<NativeGmailNavItemView> {
  return waitFor(() => {
    const navContainer = GmailElementGetter.getLeftNavContainerElement();
    if (!navContainer) return null;
    return navContainer.querySelector<HTMLElement>(`.aim a[href*="#${label}"]`);
  }, 300 * 1000)
    .then((labelLinkElement) => {
      const labelElement = findParent(labelLinkElement, (el) =>
        el.classList.contains('aim')
      );

      if (!labelElement) {
        throw new Error('native nav item structured weird');
      }

      if (!(labelElement as any).__nativeGmailNavItemView) {
        (labelElement as any).__nativeGmailNavItemView =
          new NativeGmailNavItemView(driver, labelElement, label);
      }

      return (labelElement as any).__nativeGmailNavItemView;
    })
    .catch((err) => {
      if (GmailElementGetter.isStandalone()) {
        // never resolve

        // eslint-disable-next-line @typescript-eslint/no-empty-function
        return new Promise((_resolve, _reject) => {});
      }

      throw err;
    });
}
