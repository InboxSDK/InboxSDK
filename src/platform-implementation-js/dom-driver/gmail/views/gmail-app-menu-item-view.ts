import { AppMenuItemDescriptor } from '../../../namespaces/app-menu';
import GmailDriver from '../gmail-driver';
import querySelector from '../../../lib/dom/querySelectorOrFail';

export class GmailAppMenuItemView {
  #menuItemDescriptor: AppMenuItemDescriptor | undefined;
  #element?: HTMLElement;

  get element() {
    return this.#element;
  }

  set menuItemDescriptor(mewMenuItemDescriptor: AppMenuItemDescriptor) {
    this.#menuItemDescriptor = mewMenuItemDescriptor;
    this.#update();
  }

  constructor(driver: GmailDriver, appId: string) {
    this.#element = this.#setupElement();
  }

  destroy() {
    this.element?.remove();
    // TODO handle other stuff
  }

  #ELEMENT_CLASS = 'Xa inboxsdk__appMenuItem';
  #ICON_ELEMENT_CLASS = 'V6 CL';
  #HEADING_ELEMENT_CLASS = 'apW';

  #ICON_ELEMENT_SELECTOR = '.V6.CL';
  #HEADING_ELEMENT_SELECTOR = '.apW';

  #setupElement() {
    const element = document.createElement('div');
    element.className = this.#ELEMENT_CLASS;
    element.innerHTML = `
      <div class="${
        this.#ICON_ELEMENT_CLASS
      }" aria-label="//TODO" role="link" tabindex="-1"></div>
      <div class="${
        this.#HEADING_ELEMENT_CLASS
      }" role="heading" aria-level="2"></div>
    `.trim();
    return element;
  }

  #update() {
    const element = this.element;
    if (!element) return;

    element.className = `${this.#ELEMENT_CLASS} ${
      this.#menuItemDescriptor?.className ?? ''
    }`.trim();

    this.#updateName(element);
    this.#updateIcon(element);
    this.#updateARIA(element);
  }

  #updateName(element: HTMLElement) {
    const headingElement = querySelector(
      element,
      this.#HEADING_ELEMENT_SELECTOR
    );
    headingElement.textContent = this.#menuItemDescriptor?.name ?? '';
  }

  #updateIcon(element: HTMLElement) {
    const iconContainerEl = querySelector(element, this.#ICON_ELEMENT_SELECTOR);

    const backgroundImage = this.#menuItemDescriptor?.iconUrl
      ? `url(${this.#menuItemDescriptor.iconUrl}`
      : 'initial';
    iconContainerEl.style.setProperty('--background-image', backgroundImage);

    iconContainerEl.className = `${this.#ICON_ELEMENT_CLASS} ${
      this.#menuItemDescriptor?.iconClassName ?? ''
    }`.trim();
  }

  #updateARIA(element: HTMLElement) {
    const iconContainerEl = querySelector(element, this.#ICON_ELEMENT_SELECTOR);
    iconContainerEl.setAttribute(
      'aria-label',
      this.#menuItemDescriptor?.name ?? ''
    );
  }
}
