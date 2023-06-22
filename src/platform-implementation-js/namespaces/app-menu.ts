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
    darkTheme?: ThemedIcon;
    lightTheme?: ThemedIcon;
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

/**
 * In dark themes, Gmail has different colored primary buttons depending on hover or active state
 */
type PanelPrimaryButtonThemedIcon =
  | string
  | {
      panelHovered: string;
      panelDefault: string;
    };

export type AppMenuItemPanelDescriptor = {
  className?: string;
  /** In the form of HTML as a string.
   *
   * If this option is provided, the panel defaults to loading=true.  */
  loadingIcon?: string;
  primaryButton?: {
    name: string;
    onClick: (e: MouseEvent) => void;
    iconUrl?: {
      darkTheme?: PanelPrimaryButtonThemedIcon;
      lightTheme?: PanelPrimaryButtonThemedIcon;
    };
    className?: string;
  };
};

/**
 * If the user has Chat, Meet, or both enabled, this namespace allows you to add app menu items and optionally collapsible panels to the app menu.
 */
export default class AppMenu {
  #driver;

  constructor(driver: GmailDriver) {
    this.#driver = driver;
  }

  /**
   * @note This method expects @see AppMenu#isShown to be true to be called successfully.
   */
  addMenuItem(menuItemDescriptor: AppMenuItemDescriptor): AppMenuItemView {
    const navItemView = new AppMenuItemView(this.#driver, menuItemDescriptor);
    return navItemView;
  }

  /**
   * @returns true if the user has Chat, Meet, or both enabled.
   */
  async isShown() {
    const result = await GmailElementGetter.getAppMenuAsync();
    return !!result;
  }
}
