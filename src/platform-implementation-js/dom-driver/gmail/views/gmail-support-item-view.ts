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

    const supportElement = Array.from(
      driver
        .getPageTree()
        .getAllByTag('support')
        .values()
    )[0];

    console.log('=== support element', supportElement);

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
