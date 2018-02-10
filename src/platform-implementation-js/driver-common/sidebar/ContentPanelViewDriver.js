/* @flow */

import {defn} from 'ud';
import autoHtml from 'auto-html';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import delayAsap from '../../lib/delay-asap';
import type {Driver} from '../../driver-interfaces/driver';
import idMap from '../../lib/idMap';
import querySelector from '../../lib/dom/querySelectorOrFail';

class ContentPanelViewDriver {
  _driver: Driver;
  _stopper: Kefir.Observable<null>;
  _eventStream = kefirBus();

  // This is not the `id` property passed by the application, but a random
  // unique identifier used to manage a specific instance.
  _instanceId: string = `${Date.now()}-${Math.random()}`;
  _sidebarId: string;

  constructor(driver: Driver, descriptor: Kefir.Observable<Object>, sidebarId: string) {
    this._driver = driver;
    this._sidebarId = sidebarId;
    this._stopper = this._eventStream.ignoreValues().beforeEnd(() => null).toProperty();

    const document = global.document; //fix for unit test

    this._eventStream.plug(
      Kefir.fromEvents((document.body:any), 'inboxsdkSidebarPanelActivated')
        .filter(e => e.detail.instanceId === this._instanceId)
        .map(() => ({eventName: 'activate'}))
        .flatMap(delayAsap)
    );
    this._eventStream.plug(
      Kefir.fromEvents((document.body:any), 'inboxsdkSidebarPanelDeactivated')
        .filter(e => e.detail.instanceId === this._instanceId)
        .map(() => ({eventName: 'deactivate'}))
        .flatMap(delayAsap)
    );

    // Attach a value-listener so that it immediately subscribes and the
    // property retains its value.
    const afterAsap = delayAsap().toProperty().onValue(()=>{});

    let hasPlacedAlready = false;
    let appName;
    const waitingPlatform = querySelector((document.body:any), '.'+idMap('app_sidebar_waiting_platform'));

    descriptor
      .flatMap(x => afterAsap.map(()=>x))
      .takeUntilBy(this._stopper)
      .onValue(descriptor => {
        const {el, iconUrl, iconClass, title, orderHint, id, hideTitleBar, appIconUrl, primaryColor, secondaryColor} = descriptor;
        appName = descriptor.appName;
        if (!((document.body:any):HTMLElement).contains(el)) {
          waitingPlatform.appendChild(el);
        }
        const eventName = hasPlacedAlready ? 'inboxsdkUpdateSidebarPanel' : 'inboxsdkNewSidebarPanel';
        hasPlacedAlready = true;

        el.dispatchEvent(new CustomEvent(
          eventName,
          {
            bubbles: true, cancelable: false,
            detail: {
              title, iconUrl, iconClass,
              sidebarId: this._sidebarId,
              instanceId: this._instanceId,
              appId: this._driver.getAppId(),
              id: String(id || title),
              appName: appName || this._driver.getOpts().appName || title,
              appIconUrl: appIconUrl || this._driver.getOpts().appIconUrl || iconUrl,
              hideTitleBar: Boolean(hideTitleBar),
              orderHint: typeof orderHint === 'number' ? orderHint : 0,
              primaryColor: primaryColor || this._driver.getOpts().primaryColor,
              secondaryColor: secondaryColor || this._driver.getOpts().secondaryColor
            }
          }
        ));
      });
    this._stopper.onValue(() => {
      if (!hasPlacedAlready) return;
      ((document.body:any):HTMLElement).dispatchEvent(new CustomEvent('inboxsdkRemoveSidebarPanel', {
        bubbles: true, cancelable: false,
        detail: {
          sidebarId: this._sidebarId,
          instanceId: this._instanceId,
          appName: appName || this._driver.getOpts().appName
        }
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
    ((document.body:any):HTMLElement).dispatchEvent(new CustomEvent('inboxsdkSidebarPanelScrollIntoView', {
      bubbles: true, cancelable: false,
      detail: {sidebarId: this._sidebarId, instanceId: this._instanceId}
    }));
  }

  remove() {
    this._eventStream.end();
  }
}

export default defn(module, ContentPanelViewDriver);
