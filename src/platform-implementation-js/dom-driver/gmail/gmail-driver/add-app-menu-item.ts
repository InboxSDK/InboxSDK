import { AppMenuItemDescriptor } from '../../../namespaces/app-menu';
import { GmailAppMenuItemView } from '../views/gmail-app-menu-item-view';
import GmailDriver from '../gmail-driver';
import GmailElementGetter from '../gmail-element-getter';
import Logger from '../../../lib/logger';

export async function addAppMenuItem(
  driver: GmailDriver,
  menuItemDescriptor: AppMenuItemDescriptor
) {
  const appMenuInjectionContainer = await GmailElementGetter.getAppMenuAsync();

  const gmailAppMenuItemView = new GmailAppMenuItemView(driver);
  gmailAppMenuItemView.setMenuItemDescriptor(menuItemDescriptor);

  try {
    if (!appMenuInjectionContainer || !gmailAppMenuItemView.element) return;

    const siblingElement = Number.isInteger(menuItemDescriptor.insertIndex)
      ? appMenuInjectionContainer.childNodes[menuItemDescriptor.insertIndex!] ??
        null
      : null;
    appMenuInjectionContainer.insertBefore(
      gmailAppMenuItemView.element,
      siblingElement
    );
  } catch (err) {
    Logger.error(err);
  }

  return gmailAppMenuItemView;
}
