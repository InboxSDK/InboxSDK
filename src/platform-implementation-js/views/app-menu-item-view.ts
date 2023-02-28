import TypedEmitter from 'typed-emitter';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';

import EventEmitter from '../lib/safe-event-emitter';
import {
  GmailAppMenuItemView,
  NATIVE_CLASS,
  INBOXSDK_CLASS,
} from '../dom-driver/gmail/views/gmail-app-menu-item-view';
import {
  AppMenuItemDescriptor,
  AppMenuItemPanelDescriptor,
} from '../namespaces/app-menu';
import {
  NATIVE_CLASS as PANEL_NATIVE_CLASS,
  CollapsiblePanelView,
} from './collapsible-panel-view';
import GmailDriver from '../dom-driver/gmail/gmail-driver';
import { addCollapsiblePanel } from '../dom-driver/gmail/gmail-driver/add-collapsible-panel';
import GmailElementGetter from '../dom-driver/gmail/gmail-element-getter';
import defer from '../../common/defer';

type MessageEvents = {
  blur: () => void;
  click: () => void;
  hover: () => void;
  destroy: () => void;
};

enum NativeAppMenuClassName {
  MAIL = 'XJ',
  CHAT = 'ao4',
  SPACES = 'aIt',
  MEET = 'adZ',
}

// Native Gmail menu button => the panel class names mapping
const nativeButtonToPanelMap = new Map([
  [NativeAppMenuClassName.MAIL, 'aIH'], // Mail
  [NativeAppMenuClassName.CHAT, 'arL'], // Chat
  [NativeAppMenuClassName.SPACES, 'arM'], // Spaces
  [NativeAppMenuClassName.MEET, undefined], // Meet
]);

/**
 * Mail routes list is not exhaustive
 */
const MAIL_ROUTES = ['inbox/:page'];
const CHAT_ROUTES = ['chat/welcome', 'chat/dm/:chatID'];
const SPACES_ROUTES = ['rooms/welcome', 'chat/space/:spaceID'];
const MEET_ROUTES = ['calls'];

const routeIDtoMenuItemClass = Object.fromEntries([
  ...MAIL_ROUTES.map((route) => [route, NativeAppMenuClassName.MAIL] as const),
  ...CHAT_ROUTES.map((route) => [route, NativeAppMenuClassName.CHAT] as const),
  ...SPACES_ROUTES.map(
    (route) => [route, NativeAppMenuClassName.SPACES] as const
  ),
  ...MEET_ROUTES.map((route) => [route, NativeAppMenuClassName.MEET] as const),
]);

type StreamType =
  | ['click', HTMLElement]
  | ['mouseenter' | 'mouseleave', HTMLElement, MouseEvent];

/**
 * Contains both a native Gmail app menu item and a collapsible panel.
 */
export class AppMenuItemView extends (EventEmitter as new () => TypedEmitter<MessageEvents>) {
  static #menuItemChangeStream = Kefir.pool<StreamType, unknown>();
  static #menuItemChangeBus = kefirBus<StreamType, unknown>();
  static #menuItemAddedDeferred = defer<undefined>();
  static #routeViewDriverStream: ReturnType<
    GmailDriver['getRouteViewDriverStream']
  >;
  static #menuItemToPanelMap = new Map<HTMLElement, HTMLElement | undefined>();
  static #appMenuItemViews = new Set<AppMenuItemView>();
  static #getActivePanel() {
    const appMenuElement = GmailElementGetter.getAppMenuContainer();
    const { ACTIVE } = CollapsiblePanelView.elementCss;

    const nativePanel = appMenuElement?.querySelector<HTMLElement>(
      `.${PANEL_NATIVE_CLASS}.${ACTIVE}`
    );

    return nativePanel;
  }
  static #getActiveMenuItem() {
    const appMenuElement = GmailElementGetter.getAppMenuContainer();
    const { ACTIVE } = GmailAppMenuItemView.elementCss;

    const button = appMenuElement?.querySelector<HTMLElement>(
      `.${NATIVE_CLASS}.${ACTIVE}`
    );

    return button;
  }
  static #setUpRouteViewDriverStream(driver: GmailDriver) {
    if (AppMenuItemView.#routeViewDriverStream) return;

    AppMenuItemView.#routeViewDriverStream = driver.getRouteViewDriverStream();

    // Activate menu items on route changes. Used for deep-links, browser history navigation etc.
    AppMenuItemView.#routeViewDriverStream.onValue(async (routeView) => {
      const routeViewID = routeView.getRouteID();
      const routeType = routeView.getRouteType();

      /* Handling custom app menu items */
      const descriptors = Array.from(
        AppMenuItemView.#appMenuItemViews,
        async (appMenuItemView) => {
          const gmailView = await appMenuItemView.#gmailViewPromise;
          return [gmailView.menuItemDescriptor, gmailView] as const;
        }
      );

      const results = await Promise.all(descriptors);

      const [, gmailView] =
        results.find(([descriptor]) => {
          return descriptor?.isRouteActive(routeView);
        }) ?? [];

      if (gmailView?.element) {
        AppMenuItemView.#menuItemChangeBus.emit(['click', gmailView.element]);
        return;
      }

      /* Handling native app menu items */
      let menuItemClass = '';
      if (routeViewID) {
        menuItemClass = routeIDtoMenuItemClass[routeViewID];
      }

      if ((!routeViewID || !menuItemClass) && routeType !== 'CUSTOM') {
        menuItemClass = NativeAppMenuClassName.MAIL;
      }

      const menuItemElement =
        menuItemClass &&
        document.querySelector<HTMLElement>(`.${menuItemClass}`);

      if (menuItemElement) {
        AppMenuItemView.#menuItemChangeBus.emit(['click', menuItemElement]);
      }
    });
  }
  static #handlePanelLessMode() {
    const activePanel = AppMenuItemView.#getActivePanel();
    const noActivePanel = !activePanel;

    for (const panel of document.querySelectorAll(
      CollapsiblePanelView.elementSelectors.NATIVE
    ) ?? []) {
      panel.classList.toggle(
        CollapsiblePanelView.elementCss.PANEL_LESS,
        noActivePanel
      );
    }
    GmailElementGetter.getAppMenu()?.classList.toggle('aTO', noActivePanel);
    GmailElementGetter.getAppHeader()?.classList.toggle('aTO', noActivePanel);
  }
  static {
    (async function init() {
      const gmailAppMenu = await GmailElementGetter.getAppMenuAsync();
      if (!gmailAppMenu) {
        return;
      }

      AppMenuItemView.#menuItemChangeStream.plug(
        AppMenuItemView.#menuItemChangeBus
      );

      // Set up menu item panel -> menu collapsible panel element mappings
      for (const [menuItemClass, panelClass] of nativeButtonToPanelMap) {
        const menuItemElement = document.querySelector<HTMLElement>(
          `.${NATIVE_CLASS}.${menuItemClass}`
        );
        const panelElement = panelClass
          ? document.querySelector<HTMLElement>(
              `.${PANEL_NATIVE_CLASS}.${panelClass}`
            )
          : null;

        if (menuItemElement) {
          AppMenuItemView.#menuItemToPanelMap.set(
            menuItemElement,
            panelElement ?? undefined
          );
        }
      }
    })();
  }
  static {
    AppMenuItemView.#menuItemAddedDeferred.promise.then(() => {
      // Set up event listeners we use to control menu UI
      // We intercept some events emitted on Gmail (native) menu items to gain full control of the menu (menu items and panels).
      // Thus, some native event handlers won't be invoked so we replicate the Gmail's behavior by ourselves.
      const appMenuElement = GmailElementGetter.getAppMenuContainer();
      for (const nativeMenuItem of appMenuElement?.querySelectorAll<HTMLElement>(
        `.${NATIVE_CLASS}:not(.${INBOXSDK_CLASS})`
      ) ?? []) {
        // Gmail uses this listener for panel hover state activation. It's prevented from propagation and we handle UI updates
        const buttonElement =
          nativeMenuItem.querySelector<HTMLElement>('.V6.CL');
        buttonElement?.addEventListener(
          'mouseenter',
          (e) => {
            e.stopImmediatePropagation();
            AppMenuItemView.#menuItemChangeBus.emit([
              'mouseenter',
              nativeMenuItem,
              e,
            ]);
          },
          true
        );

        // Gmail uses this listener for panel hover state deactivation. It's prevented from propagation and we handle UI updates
        nativeMenuItem.addEventListener(
          'mouseleave',
          (e) => {
            e.stopImmediatePropagation();
            AppMenuItemView.#menuItemChangeBus.emit([
              'mouseleave',
              nativeMenuItem,
              e,
            ]);
          },
          true
        );

        // Click event isn't prevented from propagation to let Gmail handle routing. The styling is handled by us
        nativeMenuItem.addEventListener('click', () => {
          AppMenuItemView.#menuItemChangeBus.emit(['click', nativeMenuItem]);
        });

        // Handle moving cursor out of panel. We use it to enhance the styling since it won't be handled by Gmail
        const panel = AppMenuItemView.#menuItemToPanelMap.get(nativeMenuItem);
        panel?.addEventListener('mouseleave', (e) => {
          AppMenuItemView.#menuItemChangeBus.emit([
            'mouseleave',
            nativeMenuItem,
            e,
          ]);
        });
      }
    });
  }
  static {
    AppMenuItemView.#menuItemChangeStream.onValue(async (v) => {
      const [type, menuItem, mouseEvent] = v;
      const { ACTIVE, HOVER } = GmailAppMenuItemView.elementCss;

      switch (type) {
        case 'mouseenter': {
          const panel = AppMenuItemView.#menuItemToPanelMap.get(menuItem);
          const activeMenuItem = AppMenuItemView.#getActiveMenuItem();
          const activePanel = AppMenuItemView.#getActivePanel();
          const burgerMenuOpen = GmailElementGetter.isAppBurgerMenuOpen();

          // hover-styled panel is displayed for collapsed burger menu
          if (
            activeMenuItem === menuItem &&
            activePanel === panel &&
            burgerMenuOpen
          )
            return;

          // deactivate active panel
          if (activePanel) {
            activePanel.style.removeProperty('height');
            activePanel.classList.remove(
              CollapsiblePanelView.elementCss.ACTIVE
            );
            activePanel.classList.remove(CollapsiblePanelView.elementCss.HOVER);
          }

          // activate new panel
          if (panel) {
            const height =
              window.innerHeight - panel.getBoundingClientRect().top;
            panel.style.cssText = `height: ${height}px;`;
            panel.classList.add(CollapsiblePanelView.elementCss.ACTIVE);
            panel.classList.add(CollapsiblePanelView.elementCss.HOVER);
            // hover menu item
            menuItem.classList.add(HOVER);
            // handle burger menu collapsed
            if (!burgerMenuOpen) {
              for (const panel of document.querySelectorAll(
                CollapsiblePanelView.elementSelectors.NATIVE
              ) ?? []) {
                panel.classList.add(
                  CollapsiblePanelView.elementCss.COLLAPSED_HOVER
                );
              }
            }
          } else {
            // panel doesn't exist (i.e. Meet) so activate active menu item's panel instead (as Gmail currently does -- FEB 2023)
            const panel =
              activeMenuItem &&
              AppMenuItemView.#menuItemToPanelMap.get(activeMenuItem);
            panel?.classList.add(CollapsiblePanelView.elementCss.ACTIVE);
          }

          break;
        }

        case 'mouseleave': {
          const activeMenuItem = AppMenuItemView.#getActiveMenuItem();
          const activePanel = AppMenuItemView.#getActivePanel();
          const activeMenuItemPanel =
            activeMenuItem &&
            AppMenuItemView.#menuItemToPanelMap.get(activeMenuItem);

          if (
            mouseEvent.relatedTarget instanceof Node &&
            (menuItem.contains(mouseEvent.relatedTarget) ||
              activePanel?.contains(mouseEvent.relatedTarget))
          )
            return;

          const burgerMenuOpen = GmailElementGetter.isAppBurgerMenuOpen();

          if (activePanel === activeMenuItemPanel && burgerMenuOpen) return;

          // unhover menu item
          menuItem.classList.remove(HOVER);

          // handle burger menu collapsed
          for (const panel of document.querySelectorAll(
            CollapsiblePanelView.elementSelectors.NATIVE
          ) ?? []) {
            panel.classList.remove(
              CollapsiblePanelView.elementCss.COLLAPSED_HOVER
            );
          }

          // deactivate active panel
          if (activePanel) {
            activePanel.style.removeProperty('height');
            activePanel.classList.remove(
              CollapsiblePanelView.elementCss.ACTIVE
            );
            activePanel.classList.remove(CollapsiblePanelView.elementCss.HOVER);
          }

          // activate active menu item panel
          if (activeMenuItemPanel) {
            activeMenuItemPanel.classList.add(
              CollapsiblePanelView.elementCss.ACTIVE
            );
          }
          break;
        }

        case 'click': {
          const appMenuElement = GmailElementGetter.getAppMenuContainer();

          // deactivate active panel
          const activePanel = AppMenuItemView.#getActivePanel();
          if (activePanel) {
            activePanel.style.removeProperty('height');
            activePanel.classList.remove(
              CollapsiblePanelView.elementCss.ACTIVE
            );
            activePanel.classList.remove(CollapsiblePanelView.elementCss.HOVER);
          }

          // deactivate menu items
          for (const menuItem_ of appMenuElement?.querySelectorAll(
            `.${NATIVE_CLASS}`
          ) ?? []) {
            menuItem_.classList.remove(ACTIVE);
            menuItem_.classList.remove(HOVER);
          }

          // activate menu item
          menuItem.classList.add(ACTIVE);
          // activate panel
          const panel = AppMenuItemView.#menuItemToPanelMap.get(menuItem);
          if (panel) {
            panel.classList.add(CollapsiblePanelView.elementCss.ACTIVE);
          }

          // handle no panel
          AppMenuItemView.#handlePanelLessMode();
          break;
        }
      }
    });
  }

  get menuItemDescriptor() {
    return this.#menuItemDescriptor;
  }

  #driver;
  #destroyed = false;
  #gmailViewPromise: Promise<GmailAppMenuItemView>;
  #collapsiblePanel?: CollapsiblePanelView;
  #menuItemDescriptor;

  constructor(driver: GmailDriver, menuItemDescriptor: AppMenuItemDescriptor) {
    super();
    this.#driver = driver;
    this.#menuItemDescriptor = menuItemDescriptor;

    const gmailAppMenuItemView =
      this.#driver.addAppMenuItem(menuItemDescriptor);

    this.#gmailViewPromise = gmailAppMenuItemView;

    gmailAppMenuItemView.then((gmailView) => {
      if (this.#destroyed || !gmailView) {
        return; //we have been removed already
      }
      const gmailElement = gmailView.element;

      if (gmailElement) {
        AppMenuItemView.#menuItemToPanelMap.set(gmailElement, undefined);
      }

      gmailView.on('destroy', () => {
        this.remove();
      });

      gmailView.on('click', () => {
        AppMenuItemView.#menuItemChangeBus.emit(['click', gmailElement!]);
        this.emit('click');
      });

      gmailView.on('hover', (e) => {
        AppMenuItemView.#menuItemChangeBus.emit([
          'mouseenter',
          gmailElement!,
          e,
        ]);
        this.emit('hover');
      });

      gmailView.on('blur', (e) => {
        AppMenuItemView.#menuItemChangeBus.emit([
          'mouseleave',
          gmailElement!,
          e,
        ]);
        this.emit('blur');
      });
    });

    AppMenuItemView.#setUpRouteViewDriverStream(driver);
    AppMenuItemView.#menuItemAddedDeferred.resolve(undefined);

    AppMenuItemView.#appMenuItemViews.add(this);
  }

  async addCollapsiblePanel(panelDescriptor: AppMenuItemPanelDescriptor) {
    const collapsiblePanel = await addCollapsiblePanel(
      this.#driver,
      panelDescriptor
    );

    if (collapsiblePanel) {
      this.#gmailViewPromise.then((gmailView) => {
        const gmailElement = gmailView.element;

        if (gmailElement) {
          collapsiblePanel.on('blur', (e) => {
            AppMenuItemView.#menuItemChangeBus.value([
              'mouseleave',
              gmailElement,
              e,
            ]);
          });
        }

        if (gmailElement && collapsiblePanel) {
          AppMenuItemView.#menuItemToPanelMap.set(
            gmailElement,
            collapsiblePanel.element
          );
        }
      });
    }

    this.#collapsiblePanel = collapsiblePanel;
    return collapsiblePanel;
  }

  async update(menuItemDescriptor: AppMenuItemDescriptor) {
    const gmailView = await this.#gmailViewPromise;
    gmailView.setMenuItemDescriptor(menuItemDescriptor);
    this.#menuItemDescriptor = menuItemDescriptor;
  }

  remove() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.emit('destroy');
    this.#collapsiblePanel?.remove();
    this.#gmailViewPromise.then((gmailView) => {
      gmailView.element &&
        AppMenuItemView.#menuItemToPanelMap.delete(gmailView.element);
      gmailView.remove();
    });
    AppMenuItemView.#appMenuItemViews.delete(this);
  }
}
