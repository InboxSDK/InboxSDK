/* @flow */

import {defn} from 'ud';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';

class GmailBackdrop {
  _stopper: Kefir.Observable<null>&{destroy():void} = kefirStopper();

  constructor(zIndex=500, target=document.body) {
    const el = document.createElement('div');
    el.className = 'Kj-JD-Jh inboxsdk__modal_overlay';
    el.style.zIndex = String(zIndex);
    target.appendChild(el);

    this._stopper.onValue(() => {
      el.remove();
    });
  }

  getStopper(): Kefir.Observable<null> {
    return this._stopper;
  }

  destroy() {
    this._stopper.destroy();
  }
}

export default defn(module, GmailBackdrop);
