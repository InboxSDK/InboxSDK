/* @flow */

import _ from 'lodash';
import {defn} from 'ud';
import autoHtml from 'auto-html';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import React from 'react';
import ReactDOM from 'react-dom';
import findParent from '../../../../common/find-parent';
import delayAsap from '../../../lib/delay-asap';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
import fromEventTargetCapture from '../../../lib/from-event-target-capture';
import OrderManager from 'order-manager';
import idMap from '../../../lib/idMap';
import incrementName from '../../../lib/incrementName';
import type GmailDriver from '../gmail-driver';

import AppSidebar from '../../../driver-common/sidebar/AppSidebar';
import ContentPanelViewDriver from '../../../driver-common/sidebar/ContentPanelViewDriver';

class GmailAppSidebarView {
  _stopper = kefirStopper();
  _driver: GmailDriver;
  _sidebarContainerEl: HTMLElement;
  _el: HTMLElement;
  _instanceId: string;

  constructor(driver: GmailDriver, sidebarContainerEl: HTMLElement) {
    this._driver = driver;
    this._sidebarContainerEl = sidebarContainerEl;

    // We need to be able to cooperate with other apps/extensions that are
    // sharing the app sidebar. We store some properties as attributes in the
    // shared DOM instead of as class properties; class properties are mostly
    // restricted to being used for references to DOM nodes. When
    // GmailAppSidebarView is instantiated, we check to see if the element
    // already exists and create it if it doesn't.
    const el = sidebarContainerEl.querySelector('.'+idMap('app_sidebar_container'));
    if (el) {
      this._el = el;
      this._instanceId = el.getAttribute('data-instance-id');
    } else {
      this._createElement();
    }
  }

  destroy() {
    this._stopper.destroy();
  }

  // This value controls whether the app sidebar should automatically open
  // itself when available when the chat sidebar isn't present. It's only set
  // if the user interacts with the app sidebar button.
  _getShouldAppSidebarOpen(): boolean {
    return localStorage.getItem('inboxsdk__app_sidebar_should_open') === 'true';
  }

  _setShouldAppSidebarOpen(open: boolean) {
    try {
      localStorage.setItem('inboxsdk__app_sidebar_should_open', String(open));
    } catch(err) {
      console.error('error saving', err);
    }
  }

  _createElement() {
    const el = this._el = document.createElement('div');
    el.className = idMap('app_sidebar_container');
    el.setAttribute('data-instance-id', `${Date.now()}-${Math.random()}`);
    this._sidebarContainerEl.classList.add(idMap('app_sidebar_in_use'));
    this._sidebarContainerEl.insertBefore(el, this._sidebarContainerEl.firstElementChild);

    this._instanceId = el.getAttribute('data-instance-id');

    if (!document.body.querySelector('.'+idMap('app_sidebar_waiting_platform'))) {
      const waitingPlatform = document.createElement('div');
      waitingPlatform.className = idMap('app_sidebar_waiting_platform');
      document.body.appendChild(waitingPlatform);
    }

    const containerEl = findParent(this._sidebarContainerEl, el => window.getComputedStyle(el).overflowY !== 'visible');
    const container = containerEl ? (() => containerEl) : undefined;

    const currentIds = new Set();
    const orderManager = new OrderManager({
      get() {
        try {
          return JSON.parse(localStorage.getItem('inboxsdk__sidebar_ordering') || 'null');
        } catch (err) {
          console.error('failed to read sidebar order data', err);
        }
      },
      set(data) {
        try {
          localStorage.setItem('inboxsdk__sidebar_ordering', JSON.stringify(data));
        } catch (err) {
          console.error('failed to set sidebar order data', err);
        }
      }
    });
    let component: AppSidebar;

    const render = () => {
      component = (ReactDOM.render(
        <AppSidebar
          panels={orderManager.getOrderedItems().map(x => x.value)}
          onMoveEnd={(newList, movedItem, oldIndex, newIndex) => {
            orderManager.moveItem(oldIndex, newIndex);
            render();
          }}
          container={container}
        />,
        el
      ): any);
    };
    render();

    Kefir.fromEvents(window, 'storage')
      .filter(e => e.key === 'inboxsdk__sidebar_ordering')
      .takeUntilBy(this._stopper)
      .onValue(() => {
        orderManager.reload();
        render();
      });

    this._stopper.onValue(() => {
      ReactDOM.unmountComponentAtNode(el);
      el.remove();
      this._sidebarContainerEl.classList.remove(idMap('app_sidebar_in_use'));
    });

    Kefir.fromEvents(document.body, 'inboxsdkNewSidebarPanel')
      .filter(e => e.detail.sidebarId === this._instanceId)
      .takeUntilBy(this._stopper)
      .onValue(event => {
        let id = event.detail.id;
        while (currentIds.has(id)) {
          id = incrementName(id);
        }
        currentIds.add(id);
        orderManager.addItem({
          groupId: event.detail.appId,
          id,
          orderHint: event.detail.orderHint,
          value: {
            id,
            appId: event.detail.appId,
            instanceId: event.detail.instanceId,
            title: event.detail.title,
            iconClass: event.detail.iconClass,
            iconUrl: event.detail.iconUrl,
            hideTitleBar: event.detail.hideTitleBar,
            el: event.target
          }
        });
        render();
      });
    Kefir.fromEvents(document.body, 'inboxsdkUpdateSidebarPanel')
      .filter(e => e.detail.sidebarId === this._instanceId)
      .takeUntilBy(this._stopper)
      .onValue(event => {
        const orderedItems = orderManager.getOrderedItems();
        const index = _.findIndex(orderedItems, x => x.value.instanceId === event.detail.instanceId);
        if (index === -1) throw new Error('should not happen: failed to find orderItem');
        orderManager.updateItemValueByIndex(index, {
          id: orderedItems[index].value.id,
          appId: event.detail.appId,
          instanceId: event.detail.instanceId,
          title: event.detail.title,
          iconClass: event.detail.iconClass,
          iconUrl: event.detail.iconUrl,
          hideTitleBar: event.detail.hideTitleBar,
          el: event.target
        });
        render();
      });
    Kefir.fromEvents(document.body, 'inboxsdkRemoveSidebarPanel')
      .filter(e => e.detail.sidebarId === this._instanceId)
      .takeUntilBy(this._stopper)
      .onValue(event => {
        const orderedItems = orderManager.getOrderedItems();
        const index = _.findIndex(orderedItems, x => x.value.instanceId === event.detail.instanceId);
        if (index === -1) throw new Error('should not happen: failed to find orderItem');
        currentIds.delete(orderedItems[index].id);
        orderManager.removeItemByIndex(index);
        if (orderManager.getOrderedItems().length === 0) {
          this.destroy();
        } else {
          render();
        }
      });
    Kefir.fromEvents(document.body, 'inboxsdkSidebarPanelScrollIntoView')
      .filter(e => e.detail.sidebarId === this._instanceId)
      .takeUntilBy(this._stopper)
      .onValue(event => {
        component.scrollPanelIntoView(event.detail.instanceId);
      });
  }

  addSidebarContentPanel(descriptor: Kefir.Observable<Object>) {
    const view = new ContentPanelViewDriver(this._driver, descriptor, this._instanceId);

    this._stopper
      .takeUntilBy(view.getStopper())
      .onValue(() => {
        view.remove();
      });

    return view;
  }
}

export default defn(module, GmailAppSidebarView);
