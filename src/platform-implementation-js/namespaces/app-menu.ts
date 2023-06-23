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
  /**
   * The icon to be used for the AppMenuItem. If `darkTheme` doesn't have a value provided, `lightTheme` is used when the Gmail theme is 'dark'.
   */
  iconUrl?: {
    darkTheme?: ThemedIcon;
    lightTheme?: ThemedIcon;
  };
  /**
   * A custom class name added to the app menu item. Can be used to customize the AppMenuItem's appearance.
   */
  className?: string;
  /**
   *  A custom class name added to the app menu item. Can be used to customize the AppMenuItem's icon element's appearance.
   */
  iconClassName?: string;
  /**
   * If the `insertOrder` option is provided, the app menu item will be added at that index. If it is not, the SDK adds the app menu item after Gmail's default app menu icons.
   */
  insertIndex?: number;
  onClick?: (e?: MouseEvent) => void | null;
  /**
   * A callback fired when the AppMenuItem or its CollapsiblePanel has a `mouseenter` event fired
   */
  onHover?: (e?: MouseEvent) => void | null;
  /**
   * The SDK route associated with the AppMenuItem. If routeID is provided, isRouteActive should be as well.
   */
  routeID?: string;
  /**
   * RouteParams provided to the SDK route ID when the AppMenuItem is clicked along with the `routeID`
   */
  routeParams?: {};
  /**
   * Whether AppMenuItem is active based on the SDK `RouteView`.
   *
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

/**
 * The AppMenuItemPanelDescriptor allows you to add a CollapsiblePanel right next your AppMenuItem which lets the user take a primary or second action.
 */
export type AppMenuItemPanelDescriptor = {
  /**
   * The custom class added to CollapsiblePanel.
   */
  className?: string;
  /** In the form of HTML as a string.
   *
   * If this option is provided, the panel defaults to loading=true.  */
  loadingIcon?: string;
  /**
   * Configuration for the CollapsiblePanel's optional primary action button.
   */
  primaryButton?: {
    name: string;
    onClick: (e: MouseEvent) => void;
    /**
     *  Icon URLs to display based on the button being hovered or not.
     */
    iconUrl?: {
      darkTheme?: PanelPrimaryButtonThemedIcon;
      lightTheme?: PanelPrimaryButtonThemedIcon;
    };
    className?: string;
  };
};

/**
 * This namespace contains functionality associated with adding app menu items to the app menu panel of Gmail. Typically, these app menu items are accessible by the user on the left side of the email client and include built in app menu items like the Mail and optionally either Chat, Meet, or both. If both Chat and Meet aren't enabled, the AppMenu will not be displayed.
*
* This namespace allows you to add your own items to this App menu. Typically, these app menu items are useful to either place high level collapsible panels like the NavMenu or send users to different Routes that you have already registered providing navigation for your entire application.
The app menu is represented as a list of items. Each item can have either a CollapsiblePanel or click handler.
Items with CollapsiblePanels can also have accessories which provide primary actions like providing a "create new" action.
*/
export default class AppMenu {
  #driver;

  constructor(driver: GmailDriver) {
    this.#driver = driver;
  }

  /**
   * Adds an app menu item to the app menu. Because the AppMenu may not be shown, this method expects `AppMenu.isShown` to be called first.
   *
   * If @see AppMenu#isShown returns `false` and this method is called, the SDK waits a bit for the AppMenu selector and then logs a warning.
   *
   * If the `insertOrder` option is provided, the app menu item will be added at that index. If it is not, the SDK adds the app menu item after Gmail's default app menu icons.
   */
  addMenuItem(menuItemDescriptor: AppMenuItemDescriptor): AppMenuItemView {
    const navItemView = new AppMenuItemView(this.#driver, menuItemDescriptor);
    return navItemView;
  }

  /**
   * @returns true if the app menu is visible. At time of writing, this typically means they have chose to enable Chat, Meet, or both.
   */
  async isShown() {
    const result = await GmailElementGetter.getAppMenuAsync();
    return !!result;
  }
}
