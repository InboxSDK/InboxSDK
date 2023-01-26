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

  #ICON_ELEMENT_SELECTOR = '.V6.CL';

  #setupElement() {
    const element = document.createElement('div');
    element.classList.add('Xa', 'inboxsdk__appMenuItem');
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
    const { iconElement: icon, name } = this.#menuItemDescriptor;
    const headingElement = querySelector(element, '.apW');
    headingElement.textContent = name;

    const existingIconContainerEl = querySelector(
      element,
      this.#ICON_ELEMENT_SELECTOR
    );
    // check for existing element
    const existingIconEl = existingIconContainerEl.querySelector<HTMLElement>(
      '[data-inboxsdk__icon="true"]'
    );

    if (existingIconEl) {
      existingIconEl.innerHTML = icon;
      return;
    }

    // create new element
    const newElement = document.createElement('div');
    newElement.innerHTML = icon;
    newElement.dataset.inboxsdk__icon = 'true';

    // https://stackoverflow.com/a/2007473/1924257
    existingIconContainerEl.insertBefore(
      newElement,
      existingIconContainerEl.firstChild
    );
  }
}
