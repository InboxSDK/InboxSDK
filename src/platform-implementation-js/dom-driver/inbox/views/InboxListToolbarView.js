/* @flow */

import {defn} from 'ud';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import InboxToolbarButtonView from './InboxToolbarButtonView';
import type InboxDriver from '../inbox-driver';

class InboxToolbarView {
  _stopper = kefirStopper();
  _el: HTMLElement;
  _driver: InboxDriver;

  constructor(el: HTMLElement, driver: InboxDriver) {
    this._el = el;
    this._driver = driver;

    this._el.classList.add('inboxsdk__list_toolbar');
  }

  getStopper(): Kefir.Observable<*> {
    return this._stopper;
  }

  destroy() {
    this._stopper.destroy();
  }

  getThreadRowViewDrivers() {
    return this._driver.getThreadRowViewDriverLiveSet().values();
  }

  getRouteViewDriver() {
    return this._driver.getCurrentRouteViewDriver();
  }

  isForRowList(): boolean {
    return true;
  }

  isForThread(): boolean {
    return false;
  }

  addButton(buttonDescriptor: Object, toolbarSections: Object, appId: string, id: string) {
    new InboxToolbarButtonView(buttonDescriptor, this._driver.getAppId(), this._stopper, this._el);
  }
}

export default defn(module, InboxToolbarView);
