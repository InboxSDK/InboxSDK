/* @flow */

import {defn} from 'ud';
import autoHtml from 'auto-html';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import delayAsap from '../../lib/delay-asap';
import type {Driver} from '../../driver-interfaces/driver';
import idMap from '../../lib/idMap';

class ContentPanelViewDriver {
  _driver: Driver;
  _stopper: Kefir.Observable<null>;
  _eventStream = kefirBus();

  // This is not the `id` property passed by the application, but a random
  // unique identifier used to manage a specific instance.
  _instanceId: string = `${Date.now()}-${Math.random()}`;

  constructor(driver: Driver, descriptor: Kefir.Observable<Object>) {
    this._driver = driver;
    this._stopper = this._eventStream.ignoreValues().beforeEnd(() => null).toProperty();

    this._eventStream.plug(
      Kefir.fromEvents(document.body, 'inboxsdkSidebarPanelActivated')
        .filter(e => e.detail.instanceId === this._instanceId)
        .map(() => ({eventName: 'activate'}))
        .flatMap(delayAsap)
    );
    this._eventStream.plug(
      Kefir.fromEvents(document.body, 'inboxsdkSidebarPanelDeactivated')
        .filter(e => e.detail.instanceId === this._instanceId)
        .map(() => ({eventName: 'deactivate'}))
        .flatMap(delayAsap)
    );

    // Attach a value-listener so that it immediately subscribes and the
    // property retains its value.
    const afterAsap = delayAsap().toProperty().onValue(()=>{});

    let hasPlacedAlready = false;
    const waitingPlatform = document.body.querySelector('.'+idMap('app_sidebar_waiting_platform'));
    descriptor
      .flatMap(x => afterAsap.map(()=>x))
      .takeUntilBy(this._stopper)
      .onValue(descriptor => {
        const {el, iconUrl, iconClass, title, orderHint, id, hideTitleBar} = descriptor;
        if (!document.body.contains(el)) {
          waitingPlatform.appendChild(el);
        }
        const eventName = hasPlacedAlready ? 'inboxsdkUpdateSidebarPanel' : 'inboxsdkNewSidebarPanel';
        hasPlacedAlready = true;
        el.dispatchEvent(new CustomEvent(
          eventName,
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

export default defn(module, ContentPanelViewDriver);
