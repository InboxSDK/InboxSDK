import * as Kefir from 'kefir';
import kefirStopper, { Stopper } from 'kefir-stopper';
import GmailDriver from '../gmail-driver';

export default class GmailSupportItemView {
  _stopper: Stopper;
  _driver: GmailDriver;
  _supportMenuElement: HTMLElement | null = null;
  _insertElement: HTMLElement | null = null;
  _insertPosition: number;

  constructor(
    driver: GmailDriver,
    supportItemElement: HTMLElement,
    insertPosition: number = 0
  ) {
    this._driver = driver;
    this._stopper = kefirStopper();
    this._insertElement = supportItemElement;
    this._insertPosition = insertPosition;

    this.setup();
  }

  destroy() {
    this._stopper.destroy();
    if (this._insertElement) {
      this._insertElement.remove();
    }
  }

  setup() {
    const supportMenuNodes = this._driver
      .getPageTree()
      .getAllByTag('supportMenu');
    supportMenuNodes.subscribe(changes => {
      changes.forEach(change => {
        if (change.type === 'add') {
          this._supportMenuElement = change.value.getValue();
          this.addSupportElement();
        } else if (change.type === 'remove') {
          this._supportMenuElement = null;
        }
      });
    });
  }

  addSupportElement() {
    const insertElementContainer = document.createElement('div');
    const menuItemAttributes = this._supportMenuElement!.children.item(0)!
      .attributes;

    for (const attribute of menuItemAttributes!) {
      if (attribute.name === 'aria-label') {
        continue;
      }
      if (attribute.name === 'class') {
        const classes = `${attribute.value} inboxsdk__support_menuItem`;
        insertElementContainer.setAttribute(attribute.name, classes);
        continue;
      }
      insertElementContainer.setAttribute(attribute.name, attribute.value);
    }

    // Append to-be-inserted element
    insertElementContainer.append(this._insertElement!);
    this._supportMenuElement!.append(insertElementContainer);

    // Adjust insert position
    if (this._insertPosition !== 0) {
      this._supportMenuElement!.children.item(this._insertPosition)!.after(
        insertElementContainer
      );
    }
  }
}
