import { AppMenuItemDescriptor } from '../../../namespaces/app-menu';
import GmailDriver from '../gmail-driver';
import querySelector from '../../../lib/dom/querySelectorOrFail';
import TypedEventEmitter from 'typed-emitter';
import { EventEmitter } from 'events';

type MessageEvents = {
  click: () => void;
  hover: () => void;
  destroy: () => void;
};

const ELEMENT_CLASS = 'Xa inboxsdk__appMenuItem' as const;
const ICON_ELEMENT_CLASS = 'V6 CL' as const;
const HEADING_ELEMENT_CLASS = 'apW' as const;

const ICON_ELEMENT_SELECTOR = '.V6.CL' as const;
const HEADING_ELEMENT_SELECTOR = '.apW' as const;

export class GmailAppMenuItemView extends (EventEmitter as new () => TypedEventEmitter<MessageEvents>) {
  #menuItemDescriptor: AppMenuItemDescriptor | undefined;
  #element?: HTMLElement;
  #destroyed = false;

  get element() {
    return this.#element;
  }

  set menuItemDescriptor(mewMenuItemDescriptor: AppMenuItemDescriptor) {
    this.#menuItemDescriptor = mewMenuItemDescriptor;
    this.#update();
  }

  constructor(driver: GmailDriver, _appId: string) {
    super();
    this.#element = this.#setupElement();

    driver.getStopper().onValue(() => this.remove());
    this.#element.addEventListener('click', this.#onClick);
    this.#element.addEventListener('mouseover', this.#onHover);
  }

  remove() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.element?.remove();
    this.emit('destroy');
  }

  #setupElement() {
    const element = document.createElement('div');
    element.className = ELEMENT_CLASS;
    element.innerHTML = `
      <div class="${ICON_ELEMENT_CLASS}" aria-label="//TODO" role="link" tabindex="-1"></div>
      <div class="${HEADING_ELEMENT_CLASS}" role="heading" aria-level="2"></div>
    `.trim();
    return element;
  }

  #update() {
    const element = this.element;
    if (!element) return;

    element.className = `${ELEMENT_CLASS} ${
      this.#menuItemDescriptor?.className ?? ''
    }`.trim();

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

    const backgroundImage = this.#menuItemDescriptor?.iconUrl
      ? `url(${this.#menuItemDescriptor.iconUrl}`
      : 'initial';
    iconContainerEl.style.setProperty('--background-image', backgroundImage);

    iconContainerEl.className = `${ICON_ELEMENT_CLASS} ${
      this.#menuItemDescriptor?.iconClassName ?? ''
    }`.trim();
  }

  #updateARIA(element: HTMLElement) {
    const iconContainerEl = querySelector(element, ICON_ELEMENT_SELECTOR);
    iconContainerEl.setAttribute(
      'aria-label',
      this.#menuItemDescriptor?.name ?? ''
    );
  }

  #onClick(e: MouseEvent) {
    this.emit('click');
    this.#menuItemDescriptor?.onClick?.(e);
  }

  #onHover(e: MouseEvent) {
    this.emit('hover');
    this.#menuItemDescriptor?.onHover?.(e);
  }
}
