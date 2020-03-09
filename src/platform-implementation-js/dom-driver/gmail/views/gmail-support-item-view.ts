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
          console.log('==== support ele ', this._supportMenuElement);
        } else if (change.type === 'remove') {
          this._supportMenuElement = null;
        }
      });
    });
  }

  addSupportElement() {
    console.log('=== addSupportElement');
    const supportMenu = this._supportMenuElement!.append(this._insertElement!);
  }
}
