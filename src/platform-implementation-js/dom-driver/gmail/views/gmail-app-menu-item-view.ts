import { AppMenuItemDescriptor } from '../../../namespaces/app-menu';
import GmailDriver from '../gmail-driver';
import querySelector from '../../../lib/dom/querySelectorOrFail';
import TypedEventEmitter from 'typed-emitter';
import { EventEmitter } from 'events';

type MessageEvents = {
  click: () => void;
  destroy: () => void;
};

export class GmailAppMenuItemView extends (EventEmitter as new () => TypedEventEmitter<MessageEvents>) {
  #menuItemDescriptor: AppMenuItemDescriptor | undefined;
  #element?: HTMLElement;
  #onClick: AppMenuItemDescriptor['onClick'];
  readonly #MENU_ITEM_SELECTOR = '.inboxsdk__appMenuItem';
  readonly #ICON_ELEMENT_SELECTOR = '.V6.CL';

  get element() {
    return this.#element;
  }

  set menuItemDescriptor(mewMenuItemDescriptor: AppMenuItemDescriptor) {
    this.#menuItemDescriptor = mewMenuItemDescriptor;
    this.#update();
  }

  constructor(driver: GmailDriver, appId: string) {
    super();
    this.#element = this.#setupElement();
    driver.getStopper().onValue(this.remove.bind(this));
  }

  remove() {
    this.element?.remove();
    this.emit('destroy');
    // TODO handle other stuff
  }

  #setupElement() {
    const element = document.createElement('div');
    element.classList.add('Xa', this.#MENU_ITEM_SELECTOR);
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
    const { iconElement: icon, name, onClick } = this.#menuItemDescriptor;
    const headingElement = querySelector(element, '.apW');
    headingElement.textContent = name;

    const existingIconContainerEl = querySelector(
      element,
      this.#ICON_ELEMENT_SELECTOR
    );

    if (this.#onClick) {
      element.removeEventListener('click', this.#onClick);
    }

    this.#onClick = (e) => {
      this.emit('click');
      onClick?.(e);
    };

    existingIconContainerEl.addEventListener('click', this.#onClick);

    // check for existing element
    const existingIconEl = existingIconContainerEl.querySelector<HTMLElement>(
      '[data-inboxsdk__icon]'
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
