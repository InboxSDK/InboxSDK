import { AppMenuItemDescriptor } from '../../../namespaces/app-menu';
import GmailDriver from '../gmail-driver';

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
    // TODO handle other shit
  }

  #setupElement() {
    const element = document.createElement('div');
    // TODO implement
    return element;
  }

  #update() {
    // TODO
  }
}
