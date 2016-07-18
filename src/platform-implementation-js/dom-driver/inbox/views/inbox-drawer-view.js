/* @flow */

import {defn} from 'ud';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import InboxBackdrop from './inbox-backdrop';

class InboxDrawerView {
  _exitEl: HTMLElement;
  _el: HTMLElement;
  _backdrop: InboxBackdrop;
  _stopper: Kefir.Stream&{destroy():void} = kefirStopper();

  constructor(options) {
    this._backdrop = new InboxBackdrop();
    this._backdrop.getStopper().onValue(() => {
      this.destroy();
    });

    this._el = document.createElement('div');
    this._el.setAttribute('role', 'dialog');
    this._el.tabIndex = 0;
    this._el.className = 'inboxsdk__drawer_view';
    this._el.appendChild(options.el);

    document.body.appendChild(this._el);

    this._stopper.onValue(() => {
      this._el.remove();
      this._backdrop.destroy();
    });
  }

  getStopper() {
    return this._stopper;
  }

  destroy() {
    this._stopper.destroy();
  }
}

export default defn(module, InboxDrawerView);
