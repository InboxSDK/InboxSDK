/* @flow */

import {defn} from 'ud';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';

class GmailBackdrop {
  _stopper: Kefir.Stream&{destroy():void} = kefirStopper();

  constructor() {
    const el = document.createElement('div');
    el.className = 'Kj-JD-Jh inboxsdk__modal_overlay';
    document.body.appendChild(el);

    this._stopper.onValue(() => {
      el.remove();
    });
  }

  getStopper(): Kefir.Stream {
    return this._stopper;
  }

  destroy() {
    this._stopper.destroy();
  }
}

export default defn(module, GmailBackdrop);
