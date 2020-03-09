import * as Kefir from 'kefir';
import kefirStopper, { Stopper } from 'kefir-stopper';
import GmailDriver from '../gmail-driver';

export default class GmailSupportItemView {
  _stopper: Stopper;
  _driver: GmailDriver;
  _supportElement: HTMLElement | null;
  _insertElement: HTMLElement | null = null;

  constructor(
    driver: GmailDriver,
    supportItemElement: HTMLElement,
    insertPosition: number = 0
  ) {
    this._driver = driver;
    this._stopper = kefirStopper();

    console.log('=== tag tree', driver);

    // todo: get support element, add supportItemElement into the position
    this._supportElement = null;
  }

  destroy() {
    this._stopper.destroy();
    if (this._insertElement) {
      this._insertElement.remove();
    }
  }
}
