import * as Kefir from 'kefir';
import kefirStopper, { Stopper } from 'kefir-stopper';
import GmailDriver from '../gmail-driver';

export default class GmailSupportItemView {
  _stopper: Stopper;
  _driver: GmailDriver;
  _supportElement: HTMLElement | null = null;
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
    const supportNodes = this._driver.getPageTree().getAllByTag('support');
    supportNodes.subscribe(changes => {
      changes.forEach(change => {
        if (change.type === 'add') {
          this._supportElement = change.value.getValue();
          this.addSupportElement();
          console.log('==== support ele ', this._supportElement);
        } else if (change.type === 'remove') {
          this._supportElement = null;
        }
      });
    });
  }

  addSupportElement() {
    console.log('=== addSupportElement');
    this._supportElement!.append(this._insertElement!);
  }
}
