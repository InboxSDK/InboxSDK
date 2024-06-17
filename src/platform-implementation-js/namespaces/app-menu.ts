import kefir, { stream } from 'kefir';
import { RouteView } from '../../inboxsdk';
import GmailDriver from '../dom-driver/gmail/gmail-driver';
import GmailElementGetter from '../dom-driver/gmail/gmail-element-getter';
import { AppMenuItemView } from '../views/app-menu-item-view';
import { CollapsiblePanelView } from '../views/collapsible-panel-view';
import isNotNil from '../../common/isNotNil';
import makeMutationObserverChunkedStream from '../lib/dom/make-mutation-observer-chunked-stream';

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
  #events = stream<
    {
      name: 'collapseToggled';
      /**
       * The TransitionEvent that was fired when the AppMenu's collapsiblepanel toggle collapsed or open started, canceled, or ended.
       * `transactionstart` and `transitioncancel` are currently fired. We also theoretically handle `transactionend`, but it isn't currently fired.
       */
      event: TransitionEvent;
    },
    unknown
  >((emitter) => {
    const f = async () => {
      const isShown = await this.isShown();

      if (!isShown) {
        return;
      }

      const appMenu = await GmailElementGetter.getAppMenuAsync();

      if (!appMenu) {
        return;
      }

      const onTransition = async (e: TransitionEvent) => {
        const { TOGGLE_OPEN_STATE } = CollapsiblePanelView.elementCss;

        const { target, type } = e;

        if (
          target instanceof HTMLElement &&
          target.matches(CollapsiblePanelView.elementSelectors.NATIVE) &&
          ((type === 'transitionstart' &&
            target.classList.contains(TOGGLE_OPEN_STATE)) ||
            // TOGGLE_OPEN_STATE is removed on transitioncancel TransitionEvents
            type === 'transitioncancel' ||
            type === 'transitionend')
        ) {
          emitter.emit({
            name: 'collapseToggled',
            event: e,
          });
        }
      };

      kefir
        .merge<TransitionEvent, unknown>(
          (
            ['transitionstart', 'transitioncancel', 'transitionend'] as const
          ).map((x) => kefir.fromEvents(appMenu.parentElement!, x)),
        )
        .onValue(onTransition);
    };

    f();
  });

  constructor(driver: GmailDriver) {
    this.#driver = driver;

    AppMenu.#monitorAppMenuState();
  }

  /**
   * A stream of events related to the AppMenu.
   *
   * @note If the AppMenu is not shown, this stream will not emit any events.
   */
  get events() {
    return this.#events;
  }

  /**
   * @returns whether or not the AppMenu Burger is uncollapsed or not.
   */
  isMenuOpen() {
    return GmailElementGetter.isAppBurgerMenuOpen();
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

  static #monitorInitialized = false;
  static async #monitorAppMenuState() {
    /**
     * Gmail could set menu item to active asynchronously, monitor changes to the menu DOM and
     * deactivate all other menu items that don't have the SDK specific active class name.
     *
     * Same applies to menu panel. Deactivate all other panels that don't have the SDK specific active class name.
     */

    if (this.#monitorInitialized) {
      return;
    }

    this.#monitorInitialized = true;

    kefir
      .fromPromise<HTMLElement | undefined, unknown>(
        GmailElementGetter.getAppMenuAsync(),
      )
      .filter(isNotNil)
      .flatMap((appMenu) =>
        makeMutationObserverChunkedStream(appMenu, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class'],
        }).delay(0),
      )
      .filter((mutations) =>
        mutations.some(
          (m) =>
            m.target instanceof HTMLElement &&
            AppMenuItemView.isMenuItem(m.target),
        ),
      )
      .throttle(10, { leading: true, trailing: true })
      .map(() => {
        const activeMenuItem = AppMenuItemView.getActiveMenuItem();

        if (activeMenuItem) {
          const otherMenuItems = AppMenuItemView.getAllMenuItems().filter(
            (menuItem) => menuItem !== activeMenuItem,
          );

          otherMenuItems.map((menuItem) =>
            AppMenuItemView.deactivateMenuItem(menuItem),
          );
        }

        const activePanel = AppMenuItemView.getActivePanel();
        if (activePanel) {
          const otherPanels = AppMenuItemView.getAllPanels().filter(
            (panel) => panel !== activePanel,
          );

          otherPanels.map((panel) => AppMenuItemView.deactivatePanel(panel));
        }
      })
      .onValue(() => {
        // monitor forever
      });
  }
}
