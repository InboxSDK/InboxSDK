/* @flow */

import {defn} from 'ud';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import GmailAppSidebarPrimary from './primary';
import ContentPanelViewDriver from '../../../../driver-common/sidebar/ContentPanelViewDriver';
import type GmailDriver from '../../gmail-driver';
import type GmailThreadView from '../gmail-thread-view';

class GmailAppSidebarView {
  _stopper = kefirStopper();
  _driver: GmailDriver;
  _instanceId: string;

  constructor(
    driver: GmailDriver,
    companionSidebarContentContainerElement: HTMLElement
  ) {
    this._driver = driver;

    // We need to be able to cooperate with other apps/extensions that are
    // sharing the app sidebar. We store some properties as attributes in the
    // shared DOM instead of as class properties; class properties are mostly
    // restricted to being used for references to DOM nodes. When
    // GmailAppSidebarView is instantiated, we check the element for an
    // attribute to see whether a previous extension's GmailAppSidebarView has
    // already set up the sidebar or not.
    const instanceId = companionSidebarContentContainerElement.getAttribute('data-sdk-sidebar-instance-id');
    if (instanceId != null) {
      this._instanceId = instanceId;
    } else {
      const primary = new GmailAppSidebarPrimary(driver, companionSidebarContentContainerElement);
      this._instanceId = primary.getInstanceId();
    }
  }

  destroy() {
    this._stopper.destroy();
  }

  getStopper(): Kefir.Observable<*> {
    return this._stopper;
  }

  _getShouldThreadAppSidebarOpen(): boolean {
    return global.localStorage.getItem('inboxsdk__thread_app_sidebar_should_open') !== 'false';
  }

  _setShouldThreadAppSidebarOpen(open: boolean) {
    try {
      global.localStorage.setItem('inboxsdk__thread_app_sidebar_should_open', String(open));
    } catch(err) {
      console.error('error saving', err); //eslint-disable-line no-console
    }
  }

  // This value controls whether the app sidebar should automatically open
  // itself when available when the chat sidebar isn't present. It's only set
  // if the user interacts with the app sidebar button.
  _getShouldGlobalAppSidebarOpen(): boolean {
    return global.localStorage.getItem('inboxsdk__global_app_sidebar_should_open') === 'true';
  }

  _setShouldGlobalAppSidebarOpen(open: boolean) {
    try {
      global.localStorage.setItem('inboxsdk__global_app_sidebar_should_open', String(open));
    } catch(err) {
      console.error('error saving', err); //eslint-disable-line no-console
    }
  }

  addThreadSidebarContentPanel(descriptor: Kefir.Observable<Object>, threadView: GmailThreadView) {
    const panel = new ContentPanelViewDriver(this._driver, descriptor, this._instanceId);
    Kefir.merge([
      threadView.getStopper(),
      this._stopper
    ]).take(1)
      .takeUntilBy(panel.getStopper())
      .onValue(() => panel.remove());
    return panel;
  }

  addGlobalSidebarContentPanel(descriptor: Kefir.Observable<Object>) {
    const panel = new ContentPanelViewDriver(this._driver, descriptor, this._instanceId, true);
    this._stopper
      .takeUntilBy(panel.getStopper())
      .onValue(() => panel.remove());
    return panel;
  }
}

export default defn(module, GmailAppSidebarView);
