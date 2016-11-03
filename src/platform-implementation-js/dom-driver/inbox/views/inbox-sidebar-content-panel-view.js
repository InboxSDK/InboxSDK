/* @flow */

import {defn} from 'ud';
import autoHtml from 'auto-html';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import type {Driver} from '../../../driver-interfaces/driver';
import idMap from '../../../lib/idMap';

class InboxSidebarContentPanelView {
  _driver: Driver;
  _stopper: Kefir.Observable<null>;
  _eventStream = kefirBus();

  // This is not the `id` property passed by the application, but a random
  // unique identifier used to manage a specific instance.
  _instanceId: string = `${Date.now()}-${Math.random()}`;

  constructor(driver: Driver, descriptor: Kefir.Observable<Object>) {
    this._driver = driver;
    this._stopper = this._eventStream.ignoreValues().beforeEnd(() => null).toProperty();

    let hasPlacedAlready = false;
    const waitingPlatform = document.body.querySelector('.'+idMap('app_sidebar_waiting_platform'));
    descriptor
      .takeUntilBy(this._stopper)
      .onValue(descriptor => {
        const {el, iconUrl, iconClass, title, orderHint, id, hideTitleBar} = descriptor;
        if (!document.body.contains(el)) {
          waitingPlatform.appendChild(el);
        }
        el.dispatchEvent(new CustomEvent(
          hasPlacedAlready ? 'inboxsdkUpdateSidebarPanel' : 'inboxsdkNewSidebarPanel',
          {
            bubbles: true, cancelable: false,
            detail: {
              instanceId: this._instanceId,
              appId: this._driver.getAppId(),
              id: String(id || title),
              title, iconUrl, iconClass,
              hideTitleBar: Boolean(hideTitleBar),
              orderHint: typeof orderHint === 'number' ? orderHint : 0
            }
          }
        ));
        hasPlacedAlready = true;
      });
    this._stopper.onValue(() => {
      document.body.dispatchEvent(new CustomEvent('inboxsdkRemoveSidebarPanel', {
        bubbles: true, cancelable: false,
        detail: {instanceId: this._instanceId}
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
      detail: {instanceId: this._instanceId}
    }));
  }

  remove() {
    this._eventStream.end();
  }
}

export default defn(module, InboxSidebarContentPanelView);
