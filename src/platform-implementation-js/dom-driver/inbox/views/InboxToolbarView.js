/* @flow */

import {defn} from 'ud';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import InboxToolbarButtonView from './InboxToolbarButtonView';
import type InboxThreadView from './inbox-thread-view';
import type InboxDriver from '../inbox-driver';

class InboxToolbarView {
  _stopper = kefirStopper();
  _el: HTMLElement;
  _driver: InboxDriver;
  _inboxThreadView: ?InboxThreadView;

  constructor(el: HTMLElement, driver: InboxDriver, inboxThreadView: ?InboxThreadView) {
    this._el = el;
    this._driver = driver;
    this._inboxThreadView = inboxThreadView;

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
    return this._inboxThreadView == null;
  }

  isForThread(): boolean {
    return this._inboxThreadView != null;
  }

  getThreadViewDriver() {
    if (!this._inboxThreadView) {
      throw new Error('this toolbarview is not for a thread');
    }
    return this._inboxThreadView;
  }

  addButton(buttonDescriptor: Object, id?: string) {
    const button = new InboxToolbarButtonView(buttonDescriptor, this._driver.getAppId(), this._el);
    this._stopper.takeUntilBy(button.getStopper()).onValue(() => {
      button.destroy();
    });
    return button;
  }
}

export default defn(module, InboxToolbarView);
