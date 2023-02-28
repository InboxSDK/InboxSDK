import { RouteView } from '../../inboxsdk';
import GmailDriver from '../dom-driver/gmail/gmail-driver';
import GmailElementGetter from '../dom-driver/gmail/gmail-element-getter';
import { AppMenuItemView } from '../views/app-menu-item-view';

type ThemedIcon =
  | string
  | {
      active: string;
      default: string;
    };

export type AppMenuItemDescriptor = {
  name: string;
  iconUrl?: {
    darkTheme: ThemedIcon;
    lightTheme: ThemedIcon;
  };
  className?: string;
  iconClassName?: string;
  insertIndex?: number;
  onClick?: (e?: MouseEvent) => void | null;
  onHover?: (e?: MouseEvent) => void | null;
  /**
   * If routeID is provided, isRouteActive should be as well.
   */
  routeID?: string;
  routeParams?: {};
  /**
   * @example (routeView) => routeView.getRouteID() === 'inbox'
   *
   * @see RouteView
   */
  isRouteActive: (routeView: RouteView) => boolean;
};

export type AppMenuItemPanelDescriptor = {
  className?: string;
  /**
   * Controls pointer pointing towards app menu item on overlay placement.
   *
   * @interal
   */
  popoverPointerTop?: number;
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
