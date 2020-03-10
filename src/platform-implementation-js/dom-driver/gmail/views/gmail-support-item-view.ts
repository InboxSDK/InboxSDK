import kefirStopper, { Stopper } from 'kefir-stopper';
import GmailDriver from '../gmail-driver';

export default class GmailSupportItemView {
  _stopper: Stopper;
  _driver: GmailDriver;
  _supportMenuElement: HTMLElement | null = null;
  _insertElement: HTMLElement | null = null;

  constructor(driver: GmailDriver, supportItemElement: HTMLElement) {
    this._driver = driver;
    this._stopper = kefirStopper();
    this._insertElement = supportItemElement;

    this._setup();
  }

  destroy() {
    this._stopper.destroy();
    if (this._insertElement) {
      this._insertElement.remove();
    }
  }

  _setup() {
    const supportMenuNodes = this._driver
      .getPageTree()
      .getAllByTag('supportMenu');

    const subscription = supportMenuNodes.subscribe(changes => {
      changes.forEach(change => {
        if (change.type === 'add') {
          this._supportMenuElement = change.value.getValue();
          this._addSupportElement();
        } else if (change.type === 'remove') {
          this._supportMenuElement = null;
        }
      });
    });

    this._stopper.onValue(() => subscription.unsubscribe());
  }

  _addSupportElement() {
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

    // Adjust insert position to always be the last one before separator
  }
}
