import { AppMenuItemDescriptor } from '../../../namespaces/app-menu';
import { GmailAppMenuItemView } from '../views/gmail-app-menu-item-view';
import GmailDriver from '../gmail-driver';
import GmailElementGetter from '../gmail-element-getter';
import Logger from '../../../lib/logger';

export async function addAppMenuItem(
  driver: GmailDriver,
  appId: string,
  menuItemDescriptor: AppMenuItemDescriptor
) {
  // TODO await waitForNavMenuReady();

  const gmailAppMenuItemView = new GmailAppMenuItemView(driver, appId);
  gmailAppMenuItemView.menuItemDescriptor = menuItemDescriptor;

  try {
    attachAppMenuItemView(gmailAppMenuItemView);

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

function attachAppMenuItemView(gmailAppMenuItemView: GmailAppMenuItemView) {
  const appMenu = GmailElementGetter.getAppMenu();
  if (appMenu === null) {
    return null;
  }
  // business logic
}
