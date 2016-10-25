/* @flow */

import {defn} from 'ud';
import autoHtml from 'auto-html';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import idMap from '../../../lib/idMap';

class InboxSidebarContentPanelView {
  _stopper: Kefir.Observable<null>;
  _eventStream = kefirBus();
  _id: string = `${Date.now()}-${Math.random()}`;

  constructor(descriptor: Kefir.Observable<Object>) {
    this._stopper = this._eventStream.ignoreValues().beforeEnd(() => null).toProperty();

    let hasPlacedAlready = false;
    const waitingPlatform = document.body.querySelector('.'+idMap('app_sidebar_waiting_platform'));
    descriptor
      .takeUntilBy(this._stopper)
      .onValue(descriptor => {
        const {el, iconUrl, iconClass, title} = descriptor;
        if (!document.body.contains(el)) {
          waitingPlatform.appendChild(el);
        }
        el.dispatchEvent(new CustomEvent(
          hasPlacedAlready ? 'inboxsdkUpdateSidebarPanel' : 'inboxsdkNewSidebarPanel',
          {
            bubbles: true, cancelable: false,
            detail: {id: this._id, title, iconUrl, iconClass}
          }
        ));
        hasPlacedAlready = true;
      });
    this._stopper.onValue(() => {
      document.body.dispatchEvent(new CustomEvent('inboxsdkRemoveSidebarPanel', {
        bubbles: true, cancelable: false,
        detail: {id: this._id}
      }));
    });
  }

  getStopper(): Kefir.Observable<null> {
    return this._stopper;
  }

  getEventStream(): Kefir.Observable<*> {
    return this._eventStream;
  }

  scrollIntoView() {
    document.body.dispatchEvent(new CustomEvent('inboxsdkSidebarPanelScrollIntoView', {
      bubbles: true, cancelable: false,
      detail: {id: this._id}
    }));
  }

  remove() {
    this._eventStream.end();
  }
}

export default defn(module, InboxSidebarContentPanelView);
