/* @flow */

import {defn} from 'ud';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import kefirStopper from 'kefir-stopper';

class InboxSidebarContentPanelView {
  _stopper: Kefir.Observable<null>;
  _eventStream = kefirBus();
  _el: HTMLElement;

  constructor(descriptor: Kefir.Observable<Object>) {
    this._el = document.createElement('div');
    this._stopper = this._eventStream.ignoreValues().beforeEnd(() => null).toProperty();

    descriptor
      .takeUntilBy(this._stopper)
      .onValue(descriptor => {
        if (this._el.firstChild !== descriptor.el) {
          this._el.innerHTML = '';
          this._el.appendChild(descriptor.el);
        }
      });
  }

  getElement() {
    return this._el;
  }

  getStopper(): Kefir.Observable<null> {
    return this._stopper;
  }

  getEventStream(): Kefir.Observable<*> {
    return this._eventStream;
  }

  remove() {
    this._eventStream.end();
    this._el.remove();
  }
}

export default defn(module, InboxSidebarContentPanelView);
