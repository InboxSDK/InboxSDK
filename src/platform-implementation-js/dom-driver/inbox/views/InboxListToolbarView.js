/* @flow */

import {defn} from 'ud';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';

import type InboxDriver from '../inbox-driver';

class InboxToolbarView {
  _stopper = kefirStopper();
  _el: HTMLElement;
  _driver: InboxDriver;

  constructor(el: HTMLElement, driver: InboxDriver) {
    this._el = el;
    this._driver = driver;
  }

  getStopper(): Kefir.Observable<*> {
    return this._stopper;
  }

  destroy() {
    this._stopper.destroy();
  }

  getThreadRowViewDrivers() {
    // TODO
    return new Set();
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
    console.log('add button wooo'); //eslint-disable-line no-console
  }
}

export default defn(module, InboxToolbarView);
