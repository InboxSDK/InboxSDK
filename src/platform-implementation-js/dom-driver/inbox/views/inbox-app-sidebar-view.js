/* @flow */

import _ from 'lodash';
import {defn} from 'ud';
import autoHtml from 'auto-html';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import React from 'react';
import ReactDOM from 'react-dom';
import InboxAppSidebar from './InboxAppSidebar';
import fakeWindowResize from '../../../lib/fake-window-resize';
import findParent from '../../../../common/find-parent';
import getChatSidebarClassname from '../getChatSidebarClassname';
import delayAsap from '../../../lib/delay-asap';
import waitForAnimationClickBlockerGone from '../waitForAnimationClickBlockerGone';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
import fromEventTargetCapture from '../../../lib/from-event-target-capture';
import appSidebarIcon from '../../../lib/appSidebarIcon';
import OrderManager from 'order-manager';
import idMap from '../../../lib/idMap';

import type InboxDriver from '../inbox-driver';
import InboxSidebarContentPanelView from './inbox-sidebar-content-panel-view';

class InboxAppSidebarView {
  _stopper = kefirStopper();
  _driver: InboxDriver;
  _el: HTMLElement;
  _mainParent: HTMLElement;
  _openOrOpeningProp: Kefir.Observable<boolean>;

  constructor(driver: InboxDriver) {
    this._driver = driver;

    // We need to be able to cooperate with other apps/extensions that are
    // sharing the app sidebar. We store some properties as attributes in the
    // shared DOM instead of as class properties; class properties are mostly
    // restricted to being used for references to DOM nodes. When
    // InboxAppSidebarView is instantiated, we check to see if the element
    // already exists and create it if it doesn't.
    const el = document.querySelector('.'+idMap('app_sidebar_container'));
    if (el) {
      this._el = el;
    } else {
      this._createElement();
    }

    const mainParent = findParent(document.querySelector('[role=application]'), el => el.parentElement === document.body);
    if (!mainParent) {
      const err = new Error('Failed to find main parent');
      this._driver.getLogger().errorSite(err);
      throw err;
    }
    this._mainParent = mainParent;

    this._openOrOpeningProp = makeMutationObserverChunkedStream(
      this._el, {attributes: true, attributeFilter: ['data-open', 'data-is-opening']}
    )
      .toProperty(() => null)
      .map(() =>
        this._el.getAttribute('data-open') === 'true' ||
        this._el.getAttribute('data-is-opening') === 'true'
      )
      .skipDuplicates();
  }

  destroy() {
    this._stopper.destroy();
    this._el.remove();
  }

  open() {
    this._setShouldAppSidebarOpen(true);
    this._setOpenedNow(true);
  }

  close() {
    this._setShouldAppSidebarOpen(false);
    this._setOpenedNow(false);
  }

  getOpenOrOpeningStream(): Kefir.Observable<boolean> {
    return this._openOrOpeningProp;
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
    // Store the open state in the DOM rather than a class property because
    // multiple instances of InboxAppSidebarView from different apps need to
    // share the value.
    el.setAttribute('data-open', 'false');
    el.setAttribute('data-is-opening', 'false');
    document.body.appendChild(el);

    const waitingPlatform = document.createElement('div');
    waitingPlatform.className = idMap('app_sidebar_waiting_platform');
    document.body.appendChild(waitingPlatform);

    // If the user clicks the chat button while the chat sidebar and app
    // sidebar are both open, then we want the chat sidebar to become visible.
    // We block Inbox from closing the chat sidebar, and we close the app sidebar.
    fromEventTargetCapture(this._driver.getChatSidebarButton(), 'click')
      .filter(() =>
        el.getAttribute('data-open') === 'true' &&
        this._driver.getCurrentChatSidebarView().getMode() === 'SIDEBAR'
      )
      .takeUntilBy(this._stopper)
      .onValue(event => {
        event.stopImmediatePropagation();
        this._setShouldAppSidebarOpen(false);
        this._setOpenedNow(false);
      });

    this._driver.getCurrentChatSidebarView().getModeStream()
      .changes()
      .takeUntilBy(this._stopper)
      .onValue(mode => {
        if (mode === 'SIDEBAR') {
          // If the user clicks the chat button while the chat sidebar is
          // closed and the app sidebar is open, and Inbox opens the chat
          // sidebar, then we want the chat sidebar to become visible. We just
          // hide the app sidebar after Inbox brings up the chat sidebar.
          this._setShouldAppSidebarOpen(false);
          this._setOpenedNow(false);
        } else {
          // If the chat sidebar changes in any other way
          // (ie. HIDDEN<->DROPDOWN) while the app sidebar is open, then we
          // might need to fix up some class changes that Inbox might have
          // made.
          if (el.getAttribute('data-open') === 'true') {
            this._setOpenedNow(true);
          }
        }
      });

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
    let component: InboxAppSidebar;

    const render = () => {
      component = (ReactDOM.render(
        <InboxAppSidebar
          panels={orderManager.getOrderedItems().map(x => x.value)}
          onClose={() => {
            this._setShouldAppSidebarOpen(false);
            this._setOpenedNow(false);
          }}
          onOutsideClick={() => {
            this._driver.closeOpenThread();
          }}
          onMoveEnd={(newList, movedItem, oldIndex, newIndex) => {
            orderManager.moveItem(oldIndex, newIndex);
            render();
          }}
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
    });

    Kefir.fromEvents(document.body, 'inboxsdkNewSidebarPanel')
      .takeUntilBy(this._stopper)
      .onValue(event => {
        orderManager.addItem({
          groupId: event.detail.appId,
          id: event.detail.id,
          orderHint: event.detail.orderHint,
          value: {
            id: event.detail.id,
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
      .takeUntilBy(this._stopper)
      .onValue(event => {
        const index = _.findIndex(orderManager.getOrderedItems(), x => x.value.instanceId === event.detail.instanceId);
        if (index === -1) throw new Error('should not happen: failed to find orderItem');
        orderManager.updateItemValueByIndex(index, {
          id: event.detail.id,
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
      .takeUntilBy(this._stopper)
      .onValue(event => {
        const index = _.findIndex(orderManager.getOrderedItems(), x => x.value.instanceId === event.detail.instanceId);
        if (index === -1) throw new Error('should not happen: failed to find orderItem');
        orderManager.removeItemByIndex(index);
        if (orderManager.getOrderedItems().length === 0) {
          this._setOpenedNow(false);
        }
        render();
      });
    Kefir.fromEvents(document.body, 'inboxsdkSidebarPanelScrollIntoView')
      .takeUntilBy(this._stopper)
      .onValue(event => {
        component.scrollPanelIntoView(event.detail.instanceId);
      });
  }

  _setOpenedNow(open: boolean) {
    this._el.setAttribute('data-open', String(open));
    if (!open) {
      if (
        this._driver.getCurrentChatSidebarView().getMode() !== 'SIDEBAR' &&
        this._mainParent.classList.contains(getChatSidebarClassname())
      ) {
        this._mainParent.classList.remove(getChatSidebarClassname());
        this._driver.getPageCommunicator().fakeWindowResize();
      }
    } else {
      if (
        this._driver.getCurrentChatSidebarView().getMode() !== 'SIDEBAR' &&
        !this._mainParent.classList.contains(getChatSidebarClassname())
      ) {
        this._mainParent.classList.add(getChatSidebarClassname());
        this._driver.getPageCommunicator().fakeWindowResize();
      }
    }
  }

  _setOpenedAfterAnimation(open: boolean) {
    this._el.setAttribute('data-is-opening', 'true');
    waitForAnimationClickBlockerGone()
      .takeUntilBy(this._stopper)
      .takeUntilBy(makeMutationObserverChunkedStream(
        this._el, {attributes: true, attributeFilter: ['data-open']}
      ))
      .onValue(() => {
        this._setOpenedNow(open);
      })
      .onEnd(() => {
        this._el.setAttribute('data-is-opening', 'false');
      });
  }

  addSidebarContentPanel(descriptor: Kefir.Observable<Object>) {
    const view = new InboxSidebarContentPanelView(this._driver, descriptor);

    if (
      this._driver.getCurrentChatSidebarView().getMode() === 'SIDEBAR' ||
      this._getShouldAppSidebarOpen()
    ) {
      this._setOpenedAfterAnimation(true);
    }

    this._stopper
      .takeUntilBy(view.getStopper())
      .onValue(() => {
        view.remove();
      });

    return view;
  }
}

export default defn(module, InboxAppSidebarView);
