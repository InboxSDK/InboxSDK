import { AppMenuItemDescriptor } from '../../../namespaces/app-menu';
import GmailDriver from '../gmail-driver';
import querySelector from '../../../lib/dom/querySelectorOrFail';
import TypedEventEmitter from 'typed-emitter';
import { EventEmitter } from 'events';
import cx from 'classnames';
import GmailElementGetter from '../gmail-element-getter';

export type MessageEvents = {
  click: (e: MouseEvent) => void;
  blur: (e: MouseEvent) => void;
  hover: (e: MouseEvent) => void;
  destroy: () => void;
};

export const NATIVE_CLASS = 'Xa' as const;
export const INBOXSDK_CLASS = 'inboxsdk__appMenuItem' as const;
export const ELEMENT_CLASS = `${NATIVE_CLASS} ${INBOXSDK_CLASS}` as const;
const ICON_ELEMENT_CLASS = 'V6 CL' as const;
const HEADING_ELEMENT_CLASS = 'apW' as const;

const ICON_ELEMENT_SELECTOR = '.V6.CL' as const;
const HEADING_ELEMENT_SELECTOR = '.apW' as const;

export class GmailAppMenuItemView extends (EventEmitter as new () => TypedEventEmitter<MessageEvents>) {
  static elementCss = {
    HOVER: 'aIk',
    ACTIVE: 'apV',
  } as const;

  #menuItemDescriptor?: AppMenuItemDescriptor;
  #element?: HTMLElement;
  #destroyed = false;
  #driver;

  get element() {
    return this.#element;
  }

  setMenuItemDescriptor(newMenuItemDescriptor: AppMenuItemDescriptor) {
    this.#menuItemDescriptor = newMenuItemDescriptor;
    this.#update();
  }

  get menuItemDescriptor() {
    return this.#menuItemDescriptor;
  }

  constructor(driver: GmailDriver) {
    super();
    this.#element = this.#setupElement();
    this.#driver = driver;

    driver.getStopper().onValue(() => this.remove());
    this.#element.addEventListener('click', (e) => this.#onClick(e));
    this.#element.addEventListener('mouseleave', this.#onBlur);
    querySelector(this.#element, ICON_ELEMENT_SELECTOR).addEventListener(
      'mouseenter',
      this.#onHover
    );
  }

  remove() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.element?.remove();
    this.emit('destroy');
  }

  /**
   * @internal
   */
  blur() {
    this.element?.classList.remove(GmailAppMenuItemView.elementCss.HOVER);
  }

  /**
   * @internal
   */
  hover() {
    if (
      this.element?.classList.contains(GmailAppMenuItemView.elementCss.ACTIVE)
    ) {
      return;
    }
    this.element?.classList.add(GmailAppMenuItemView.elementCss.HOVER);
  }

  #setupElement() {
    const element = document.createElement('div');
    element.className = ELEMENT_CLASS;
    element.innerHTML = `
      <div class="${ICON_ELEMENT_CLASS}" aria-label="" role="link" tabindex="-1"></div>
      <div class="${HEADING_ELEMENT_CLASS}" role="heading" aria-level="2"></div>
    `.trim();
    return element;
  }

  #update() {
    const element = this.element;
    if (!element) return;

    const existingClassNames = Object.values(
      GmailAppMenuItemView.elementCss
    ).filter((className) => element.classList.contains(className));
    element.className = cx(
      ELEMENT_CLASS,
      this.#menuItemDescriptor?.className,
      ...existingClassNames
    );

    this.#updateName(element);
    this.#updateIcon(element);
    this.#updateARIA(element);
  }

  #updateName(element: HTMLElement) {
    const headingElement = querySelector(element, HEADING_ELEMENT_SELECTOR);
    headingElement.textContent = this.#menuItemDescriptor?.name ?? '';
  }

  #updateIcon(element: HTMLElement) {
    const iconContainerEl = querySelector(element, ICON_ELEMENT_SELECTOR);

    const { iconUrl, iconClassName } = this.#menuItemDescriptor ?? {};

    if (iconUrl) {
      const rawTheme = GmailElementGetter.isDarkTheme()
        ? iconUrl.darkTheme
        : iconUrl.lightTheme;
      const theme = typeof rawTheme === 'string' ? rawTheme : rawTheme.default;
      const activeImg =
        typeof rawTheme === 'string' ? rawTheme : rawTheme.active;
      iconContainerEl.style.setProperty('--background-image', `url(${theme})`);
      iconContainerEl.style.setProperty(
        '--background-image--active',
        `url(${activeImg})`
      );
    }

    iconContainerEl.className = cx(ICON_ELEMENT_CLASS, iconClassName);
  }

  #updateARIA(element: HTMLElement) {
    const iconContainerEl = querySelector(element, ICON_ELEMENT_SELECTOR);
    iconContainerEl.setAttribute(
      'aria-label',
      this.#menuItemDescriptor?.name ?? ''
    );
  }

  #onClick(e: MouseEvent) {
    this.emit('click', e);
    this.#menuItemDescriptor?.onClick?.(e);

    if (this.#menuItemDescriptor?.routeID) {
      this.#driver.goto(
        this.#menuItemDescriptor.routeID,
        this.#menuItemDescriptor.routeParams
      );
    }
  }

  #onBlur = (e: MouseEvent) => {
    this.emit('blur', e);
  };

  #onHover = (e: MouseEvent) => {
    this.emit('hover', e);
    this.#menuItemDescriptor?.onHover?.(e);
  };
}
