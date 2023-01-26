import once from 'lodash/once';

import { AppMenuItemDescriptor } from '../../../namespaces/app-menu';
import { GmailAppMenuItemView } from '../views/gmail-app-menu-item-view';
import GmailDriver from '../gmail-driver';
import GmailElementGetter from '../gmail-element-getter';
import waitFor from '../../../lib/wait-for';
import Logger from '../../../lib/logger';
import insertElementInOrder from '../../../lib/dom/insert-element-in-order';

export async function addAppMenuItem(
  driver: GmailDriver,
  appId: string,
  menuItemDescriptor: AppMenuItemDescriptor
) {
  const appMenuInjectionContainer = await waitForAppMenuReady();

  const gmailAppMenuItemView = new GmailAppMenuItemView(driver, appId);
  gmailAppMenuItemView.menuItemDescriptor = menuItemDescriptor;

  try {
    if (!appMenuInjectionContainer || !gmailAppMenuItemView.element) return;

    insertElementInOrder(
      appMenuInjectionContainer,
      gmailAppMenuItemView.element
    );

    // Need this crap?
    // gmailNavItemView
    //   .getEventStream()
    //   .filter((event) => event.eventName === 'orderChanged')
    //   .onValue(attacher);
  } catch (err) {
    Logger.error(err);
  }

  return gmailAppMenuItemView;
}

// TODO: why once?
const waitForAppMenuReady = once(async () => {
  if (!GmailElementGetter.isStandalone()) {
    await GmailElementGetter.waitForGmailModeToSettle();
    /**
     * The selector for the new app menu https://support.google.com/mail/answer/11555490 -- FEB 2023
     */
    const APP_MENU = '.aeN.WR.a6o.anZ.nH.oy8Mbf[role=navigation]';
    /**
     * If the APP_MENU selector is not found, NAV_MENU _might_ be present.
     */
    const NAV_MENU = '.aeN.WR.nH.oy8Mbf[role=navigation]';

    try {
      const element = await waitFor(() =>
        document.querySelector<HTMLElement>(`${APP_MENU}, ${NAV_MENU}`)
      );

      if (!document.querySelector(APP_MENU)) {
        return;
      }

      return element;
    } catch (e) {
      Logger.error(e);
    }
  }
});
