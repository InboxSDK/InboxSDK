import { RouteView } from '../../inboxsdk';
import GmailDriver from '../dom-driver/gmail/gmail-driver';
import GmailElementGetter from '../dom-driver/gmail/gmail-element-getter';
import { AppMenuItemView } from '../views/app-menu-item-view';

export type AppMenuItemDescriptor = {
  name: string;
  iconUrl?: {
    darkTheme: string;
    lightTheme: string;
  };
  className?: string;
  iconClassName?: string;
  insertIndex?: number;
  onClick?: (e?: MouseEvent) => void | null;
  onHover?: (e?: MouseEvent) => void | null;
  routeID?: string;
  routeParams?: {};
  isRouteActive: (routeView: RouteView) => boolean;
};

export type AppMenuItemPanelDescriptor = {
  className?: string;
  primaryButton?: {
    name: string;
    onClick: (e: MouseEvent) => void;
    iconUrl?: {
      darkTheme: string;
      lightTheme: string;
    };
    className?: string;
  };
};

/**
 * @alpha
 */
export default class AppMenu {
  #driver;

  constructor(driver: GmailDriver) {
    this.#driver = driver;
  }

  addMenuItem(menuItemDescriptor: AppMenuItemDescriptor): AppMenuItemView {
    const navItemView = new AppMenuItemView(this.#driver, menuItemDescriptor);
    return navItemView;
  }

  async isShown() {
    const result = await GmailElementGetter.getAppMenuAsync();
    return !!result;
  }
}
