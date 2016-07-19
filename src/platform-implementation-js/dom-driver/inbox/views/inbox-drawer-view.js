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
    this._backdrop.getStopper().takeUntilBy(this._stopper).onValue(() => {
      this.destroy();
    });

    this._el = document.createElement('div');
    this._el.setAttribute('role', 'dialog');
    this._el.tabIndex = 0;
    this._el.className = 'inboxsdk__drawer_view';
    this._el.appendChild(options.el);

    document.body.appendChild(this._el);

    this._stopper.onValue(() => {
      this._backdrop.destroy();
      this._el.classList.remove('inboxsdk__active');
      Kefir.fromEvents(this._el, 'transitionend')
        .take(1)
        .onValue(() => {
          this._el.remove();
        });
    });

    this._el.offsetHeight; // force layout so that adding this class does a transition.
    this._el.classList.add('inboxsdk__active');
  }

  getStopper() {
    return this._stopper;
  }

  destroy() {
    this._stopper.destroy();
  }
}

export default defn(module, InboxDrawerView);
