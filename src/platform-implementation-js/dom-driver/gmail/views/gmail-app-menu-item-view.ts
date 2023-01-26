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

  #setupElement() {
    const element = document.createElement('div');
    element.classList.add('Xa');
    element.innerHTML = `
      <div class="V6 CL" aria-label="" role="link" tabindex="-1">
        <span class="XS">
        </span>
      </div>
      <div class="apW" role="heading" aria-level="2">Chat</div>
    `.trim();
    return element;
  }

  #update() {
    const element = this.element;
    if (!element || !this.#menuItemDescriptor) {
      return;
    }
    const { name } = this.#menuItemDescriptor;
    const headingElement = querySelector(element, '.apW');
    headingElement.textContent = name;
  }
}
