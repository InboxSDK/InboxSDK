import TypedEmitter from 'typed-emitter';
import cx from 'classnames';
import * as Kefir from 'kefir';
import kefirCast from 'kefir-cast';

import EventEmitter from '../lib/safe-event-emitter';
import { AppMenuItemPanelDescriptor } from '../namespaces/app-menu';
import autoHtml from 'auto-html';
import querySelector from '../lib/dom/querySelectorOrFail';
import GmailElementGetter from '../dom-driver/gmail/gmail-element-getter';
import GmailDriver from '../dom-driver/gmail/gmail-driver';
import { NavItemDescriptor } from '../dom-driver/gmail/views/gmail-nav-item-view';
import NavItemView from './nav-item-view';
import { stylesStream } from '../dom-driver/gmail/gmail-driver/track-gmail-styles';
import isEqual from 'fast-deep-equal';

export const NATIVE_CLASS = 'aqn' as const;
export const INBOXSDK_CLASS = 'inboxsdk__collapsiblePanel' as const;
const ELEMENT_CLASS = `${NATIVE_CLASS} ${INBOXSDK_CLASS} oy8Mbf` as const;

const PRIMARY_BUTTON_ELEMENT_CLASS = 'T-I T-I-KE L3' as const;
const PRIMARY_BUTTON_ELEMENT_SELECTOR = '.T-I.T-I-KE.L3' as const;
const scrollablePanelClass = 'at9' as const;
const scrollablePanelSelector = `.${scrollablePanelClass}` as const;
const loadingElementClass =
  'inboxsdk__collapsiblePanel_loading_container' as const;
const panelLoadingClass = `${loadingElementClass}--active` as const;
const loadingElementSelector = `.${loadingElementClass}` as const;

const NAV_MENU_CONTAINER_ELEMENT_SELECTOR = '.at9 .n3 .TK' as const;

type MessageEvents = {
  /**
   * Fires when this view is destroyed.
   */
  destroy: () => void;
  /**
   * Fires when this CollapsiblePanelView's panel has a `mouseenter` event triggered.
   */
  blur: (e: MouseEvent) => void;
};

/**
 * Each AppMenuItem can have a CollapsiblePanelView.
 *
 * Typically the main action of a CollapsiblePanelView is performed when the user clicks or hovers on the app menu item.
 */
export class CollapsiblePanelView extends (EventEmitter as new () => TypedEmitter<MessageEvents>) {
  static elementSelectors = {
    /** Custom elements match this selector as well. */
    NATIVE: '.aqn.oy8Mbf',
    CUSTOM: '.inboxsdk__collapsiblePanel',
  } as const;
  static elementCss = {
    ACTIVE: 'apV',
    COLLAPSED: 'aBA',
    /** A hover popover has both ACTIVE _and_ HOVER */
    HOVER: 'aJu',
    COLLAPSED_HOVER: 'bym',
    PANEL_LESS: 'a3W',
    TOGGLE_OPEN_STATE: 'aak',
  } as const;
  #panelDescriptor: AppMenuItemPanelDescriptor;
  #element: HTMLElement;
  #destroyed = false;
  #id = Math.random().toFixed(3);
  #ARIA_LABELLED_BY_ID = Math.random().toFixed(3);
  #driver;
  #loading;

  get loading() {
    return this.#loading;
  }

  /**
   * Updates the loading property of the CollapsiblePanelView.
   */
  setLoading(loading: boolean) {
    const changed = this.#loading !== loading;
    this.#loading = loading;

    if (changed) {
      this.#update();
    }
  }

  get panelDescriptor() {
    return this.#panelDescriptor;
  }

  set panelDescriptor(panelDescriptor) {
    this.#panelDescriptor = panelDescriptor;
    this.#update();
  }

  get element() {
    return this.#element;
  }

  get scrollablePaneElement() {
    return this.element.querySelector(scrollablePanelSelector);
  }

  constructor(
    driver: GmailDriver,
    panelDescriptor: AppMenuItemPanelDescriptor
  ) {
    super();
    this.#driver = driver;
    this.#panelDescriptor = panelDescriptor;
    this.#loading = panelDescriptor.loadingIcon != null;
    this.#element = this.#setupElement();
    this.#element.addEventListener('mouseleave', (e: MouseEvent) => {
      this.emit('blur', e);
    });
    stylesStream
      .skipDuplicates((a, b) => isEqual(a, b))
      .onValue(({ type }) => {
        if (type === 'theme') {
          this.#update();
        }
      });
  }

  /**
   * Remove this CollapsiblePanelView from its parent
   */
  remove() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.element.remove();
    this.emit('destroy');
  }

  /**
   * @param navItemDescriptor Add a single or Kefir.Observable nav menu item to the CollapsiblePanel.
   */
  addNavItem(
    navItemDescriptor:
      | NavItemDescriptor
      | Kefir.Observable<NavItemDescriptor, any>
  ) {
    this.setLoading(false);
    const { element } = this;

    const navMenuContainerElement = querySelector(
      element,
      NAV_MENU_CONTAINER_ELEMENT_SELECTOR
    );

    const appId = `collapsible-panel-${this.#id}`;

    const navItemDescriptorPropertyStream = kefirCast(
      Kefir,
      navItemDescriptor
    ).toProperty();

    const gmailNavItemView = this.#driver.addNavItem(
      appId,
      navItemDescriptorPropertyStream,
      navMenuContainerElement
    );

    const navItemView = new NavItemView(
      appId,
      this.#driver,
      navItemDescriptorPropertyStream,
      gmailNavItemView
    );

    return navItemView;
  }

  #extractPrimaryButtonTheme() {
    const { iconUrl } = this.panelDescriptor.primaryButton ?? {};

    if (!iconUrl) {
      return;
    }

    const theme = GmailElementGetter.isDarkTheme()
      ? iconUrl.darkTheme
      : iconUrl.lightTheme;

    if (!theme) {
      return;
    }

    if (typeof theme === 'string') {
      return {
        panelHovered: theme,
        panelDefault: theme,
      };
    } else {
      return {
        panelDefault: theme.panelDefault,
        panelHovered: theme.panelHovered,
      };
    }
  }

  #setupElement() {
    const { panelDescriptor } = this;
    const { loadingIcon } = panelDescriptor;
    const { className, name = '' } = panelDescriptor?.primaryButton ?? {};
    const element = document.createElement('div');
    element.className = cx(ELEMENT_CLASS, this.panelDescriptor.className);
    const primaryButtonClass = cx(PRIMARY_BUTTON_ELEMENT_CLASS, className);
    const loadingElClass = cx(loadingElementClass, {
      [panelLoadingClass]: this.#loading,
    });

    const { panelDefault: defaultIconUrl, panelHovered: hoverPanelIconUrl } =
      this.#extractPrimaryButtonTheme() ?? {};

    element.innerHTML = autoHtml`
      <div class="aBO">
        <div class="aic">
          <div class="z0">
            <div class="${primaryButtonClass}" style="user-select: none" role="button" tabindex="0">
              ${name}
            </div>
          </div>
        </div>
        <div class="${scrollablePanelClass}">
          <div class="${loadingElClass}">${
      loadingIcon ? { __html: loadingIcon } : ''
    }</div>
          <div class="Ls77Lb aZ6">
            <div class="pp" style="user-select: none;">
              <div>
                <div class="nM">
                  <div class="aic"></div>
                  <div class="yJ">
                    <div class="ajl aib aZ6" aria-labelledby="${
                      this.#ARIA_LABELLED_BY_ID
                    }">
                      <h2 class="aWk" id="${
                        this.#ARIA_LABELLED_BY_ID
                      }">Labels</h2>
                      <div class="wT">
                        <div class="n3">
                          <div class="byl">
                            <div class="TK"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="aTV"></div>
    `.trim();
    const primaryBtnEl = querySelector(
      element,
      PRIMARY_BUTTON_ELEMENT_SELECTOR
    );
    primaryBtnEl.style.setProperty(
      '--background-image',
      defaultIconUrl ? `url(${defaultIconUrl})` : 'unset'
    );
    primaryBtnEl.style.setProperty(
      '--background-image--hover',
      hoverPanelIconUrl ? `url(${hoverPanelIconUrl})` : 'unset'
    );

    primaryBtnEl.addEventListener('click', this.#onPrimaryButtonClick);

    return element;
  }

  #onPrimaryButtonClick = (e: MouseEvent) => {
    this.panelDescriptor.primaryButton?.onClick?.(e);
  };

  #update() {
    const element = this.element;
    if (!element) return;

    const existingClassNames = Object.values(
      CollapsiblePanelView.elementCss
    ).filter((className) => element.classList.contains(className));
    element.className = cx(
      ELEMENT_CLASS,
      this.panelDescriptor.className,
      ...existingClassNames
    );

    this.#updateName(element);
    this.#updateIcon(element);
    this.#updateScrollablePanelLoading(element);
  }

  static #preloadedIcons = new Set<string>();

  #updateIcon(element: HTMLElement) {
    const iconContainerEl = querySelector(
      element,
      PRIMARY_BUTTON_ELEMENT_SELECTOR
    );

    const { panelDefault, panelHovered } =
      this.#extractPrimaryButtonTheme() ?? {};

    // alleviate FOUC when switching between active and default icons
    // https://stackoverflow.com/a/68521953/1924257
    for (const url of [panelHovered, panelDefault]) {
      if (!url || CollapsiblePanelView.#preloadedIcons.has(url)) {
        continue;
      }
      CollapsiblePanelView.#preloadedIcons.add(url);

      var link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      document.head.appendChild(link);
    }

    for (const [key, value] of Object.entries({
      '--background-image--hover': panelHovered,
      '--background-image': panelDefault,
    })) {
      if (value) {
        iconContainerEl.style.setProperty(key, `url(${value})`);
      } else {
        iconContainerEl.style.removeProperty(key);
      }
    }

    const { className } = this.panelDescriptor.primaryButton ?? {};
    iconContainerEl.className = cx(PRIMARY_BUTTON_ELEMENT_CLASS, className);
  }

  #updateName(element: HTMLElement) {
    const buttonTextEl = element.querySelector(PRIMARY_BUTTON_ELEMENT_SELECTOR);

    if (!buttonTextEl) {
      return;
    }

    buttonTextEl.textContent = this.panelDescriptor.primaryButton?.name ?? '';
  }

  #updateScrollablePanelLoading(element: Element) {
    const scrollablePanelLoadingEl = element.querySelector(
      loadingElementSelector
    );

    if (!scrollablePanelLoadingEl) {
      return;
    }

    if (this.loading) {
      scrollablePanelLoadingEl.classList.add(panelLoadingClass);
    } else {
      scrollablePanelLoadingEl.classList.remove(panelLoadingClass);
    }
  }
}
