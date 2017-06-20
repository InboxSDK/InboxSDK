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
import fromEventTargetCapture from '../../../lib/from-event-target-capture';
import OrderManager from 'order-manager';
import idMap from '../../../lib/idMap';
import incrementName from '../../../lib/incrementName';
import querySelector from '../../../lib/dom/querySelectorOrFail';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
import makeElementChildStream from '../../../lib/dom/make-element-child-stream';
import simulateClick from '../../../lib/dom/simulate-click';
import type GmailDriver from '../gmail-driver';

import AppSidebar from '../../../driver-common/sidebar/AppSidebar';
import ContentPanelViewDriver from '../../../driver-common/sidebar/ContentPanelViewDriver';
import GmailElementGetter from '../gmail-element-getter';

import addIconArea from './gmail-app-sidebar-view/add-icon-area';

class GmailAppSidebarView {
  _stopper = kefirStopper();
  _driver: GmailDriver;
  _sidebarContainerEl: HTMLElement;
  _addonSidebarContainerEl: ?HTMLElement;
  _el: HTMLElement;
  _instanceId: string;
  _panels: Map<string, ContentPanelViewDriver> = new Map();
  _activatedWhileLoading: boolean = false;

  constructor(driver: GmailDriver, sidebarContainerEl: HTMLElement, addonSidebarElement: ?HTMLElement) {
    this._driver = driver;
    this._sidebarContainerEl = sidebarContainerEl;
    this._addonSidebarContainerEl = addonSidebarElement;

    // We need to be able to cooperate with other apps/extensions that are
    // sharing the app sidebar. We store some properties as attributes in the
    // shared DOM instead of as class properties; class properties are mostly
    // restricted to being used for references to DOM nodes. When
    // GmailAppSidebarView is instantiated, we check to see if the element
    // already exists and create it if it doesn't.
    const el = (addonSidebarElement || sidebarContainerEl).querySelector('.'+idMap('app_sidebar_container'));
    if (el) {
      this._el = el;
      const instanceId = el.getAttribute('data-instance-id');
      if (instanceId == null) throw new Error('Failed to find instance id');
      this._instanceId = instanceId;
    } else {
      this._createElement();
    }
  }

  destroy() {
    this._stopper.destroy();
  }

  getStopper(): Kefir.Observable<*> {
    return this._stopper;
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
    let container, iconArea;
    let component: AppSidebar;

    this._instanceId = `${Date.now()}-${Math.random()}`;

    const el = this._el = document.createElement('div');
    el.className = idMap('app_sidebar_container');
    el.setAttribute('data-instance-id', this._instanceId);

    const addonSidebarContainerEl = this._addonSidebarContainerEl;
    const sidebarContainerEl = addonSidebarContainerEl || this._sidebarContainerEl;
    let contentContainer;

    sidebarContainerEl.classList.add(idMap('app_sidebar_in_use'));

    if(addonSidebarContainerEl){
      const mainContentBodyContainerElement = GmailElementGetter.getMainContentBodyContainerElement();
      if(mainContentBodyContainerElement){
        contentContainer = mainContentBodyContainerElement.parentElement;
        if(contentContainer) {
          contentContainer.classList.add('container_app_sidebar_in_use');
          querySelector(addonSidebarContainerEl, '.J-KU-Jz').insertAdjacentElement('beforebegin', el);
        }
      }
    }
    else {
      this._sidebarContainerEl.insertBefore(el, this._sidebarContainerEl.firstElementChild);
    }

    if (!((document.body:any):HTMLElement).querySelector('.'+idMap('app_sidebar_waiting_platform'))) {
      const waitingPlatform = document.createElement('div');
      waitingPlatform.className = idMap('app_sidebar_waiting_platform');
      ((document.body:any):HTMLElement).appendChild(waitingPlatform);
    }

    if(!addonSidebarContainerEl) {
      const containerEl = findParent(this._sidebarContainerEl, el => window.getComputedStyle(el).overflowY !== 'visible');
      container = containerEl ? (() => containerEl) : undefined;
    }

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
      sidebarContainerEl.classList.remove(idMap('app_sidebar_in_use'));
      sidebarContainerEl.classList.remove('app_sidebar_visible');
      if(iconArea) iconArea.remove();

      const mainContentBodyContainerElement = GmailElementGetter.getMainContentBodyContainerElement();
      if(mainContentBodyContainerElement){
        contentContainer = mainContentBodyContainerElement.parentElement;
        if(contentContainer) {
          contentContainer.classList.remove('container_app_sidebar_in_use');
        }
      }
    });

    Kefir.fromEvents((document.body:any), 'inboxsdkNewSidebarPanel')
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

        if(!addonSidebarContainerEl) return;


        iconArea = addonSidebarContainerEl.querySelector('.'+idMap('sidebar_iconArea'));
        if (!iconArea) {
          const _iconArea = iconArea = document.createElement('div');
          iconArea.className = idMap('sidebar_iconArea');

          addIconArea(iconArea, addonSidebarContainerEl, this._stopper);
        }

        const instanceId = event.detail.instanceId;

        // If there's an existing button for the app, then just increment its
        // data-count attribute instead of adding a new button.
        const existingButtonContainer = _.find(
          iconArea.querySelectorAll('.'+idMap('sidebar_button_container')),
          el => {
            const button = el.querySelector('button');
            if (!button || button.title !== event.detail.title) return false;
            const img = button.querySelector('img');
            if (!img || img.src !== event.detail.iconUrl) return false;
            return true;
          }
        );

        let container;
        if (existingButtonContainer) {
          const currentCount = Number(existingButtonContainer.getAttribute('data-count')) || 1;
          existingButtonContainer.setAttribute('data-count', currentCount+1);
          container = existingButtonContainer;
        } else {
          container = document.createElement('div');
          container.className = idMap('sidebar_button_container');
          container.innerHTML = autoHtml `
            <button class="inboxsdk__button_icon" type="button" data-tooltip="${event.detail.title}" title="${event.detail.title}">
              <img class="inboxsdk__button_iconImg" src="${event.detail.iconUrl}">
            </button>
          `;
          querySelector(container, 'button').addEventListener('click', (event: MouseEvent) => {
            event.stopPropagation();

            const activeInstanceId = el.getAttribute('data-active-instance-id');
            if(activeInstanceId === instanceId){
              if(addonSidebarContainerEl) addonSidebarContainerEl.classList.remove('app_sidebar_visible');
              el.removeAttribute('data-active-instance-id');
              this._setShouldAppSidebarOpen(false);
            }
            else{
              const panel = this._panels.get(instanceId);
              if(panel) {
                if(addonSidebarContainerEl) addonSidebarContainerEl.classList.add('app_sidebar_visible');
                el.setAttribute('data-active-instance-id', instanceId);
                panel.scrollIntoView();
                this._setShouldAppSidebarOpen(true);

                // check and deactivate add-on sidebar
                const activeAddOnIcon = addonSidebarContainerEl.querySelector('.J-KU-KO');
                if(activeAddOnIcon) simulateClick(activeAddOnIcon);

                //is the tablist still loading
                const loadingHolderAsAny: any = querySelector(addonSidebarContainerEl, '.bqI').parentElement;
                const loadingHolder = (loadingHolderAsAny: ?HTMLElement);
                if(!loadingHolder) return;

                if(loadingHolder.style.display !== 'none'){
                  this._activatedWhileLoading = true;
                  const stillFormingTablist = querySelector(addonSidebarContainerEl, '.J-KU-Jg');

                  makeMutationObserverChunkedStream(stillFormingTablist, {attributes: true, attributeFilter: ['role']})
                    .map(() => addonSidebarContainerEl.querySelector('[role=tablist]'))
                    .filter(Boolean)
                    .take(1)
                    .takeUntilBy(this._stopper)
                    .delay(10)
                    .onValue(() => {
                      this._activatedWhileLoading = false;
                    });
                }
              }
            }
          }, true);
          iconArea.appendChild(container);

          if(this._getShouldAppSidebarOpen()){
            if(addonSidebarContainerEl) addonSidebarContainerEl.classList.add('app_sidebar_visible');
            if(!el.getAttribute('data-active-instance-id')) el.setAttribute('data-active-instance-id', instanceId);
          }
        }
      });

    Kefir.fromEvents((document.body:any), 'inboxsdkUpdateSidebarPanel')
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
    Kefir.fromEvents((document.body:any), 'inboxsdkRemoveSidebarPanel')
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

        if(!addonSidebarContainerEl) return;

        iconArea = addonSidebarContainerEl.querySelector('.'+idMap('sidebar_iconArea'));
        if(!iconArea) return;

        const container = _.find(
          iconArea.querySelectorAll('.'+idMap('sidebar_button_container')),
          el => {
            const button = el.querySelector('button');
            if (!button || button.title !== event.detail.title) return false;
            const img = button.querySelector('img');
            if (!img || img.src !== event.detail.iconUrl) return false;
            return true;
          }
        );

        if(container){
          const currentCount = Number(container.getAttribute('data-count'));
          if (currentCount <= 1) {
            container.remove();
          } else if (currentCount === 2) {
            container.removeAttribute('data-count');
          } else {
            container.setAttribute('data-count', String(currentCount-1));
          }
        }
      });
    Kefir.fromEvents((document.body:any), 'inboxsdkSidebarPanelScrollIntoView')
      .filter(e => e.detail.sidebarId === this._instanceId)
      .takeUntilBy(this._stopper)
      .onValue(event => {
        component.scrollPanelIntoView(event.detail.instanceId);
      });

    if(addonSidebarContainerEl){
      makeElementChildStream(querySelector(addonSidebarContainerEl, '.J-KU-Jz'))
        .flatMap(({el, removalStream}) =>
          makeMutationObserverChunkedStream(el, {attributes: true, attributeFilter: ['style']})
            .toProperty(() => null)
            .map(() => el.style.display !== 'none')
            .filter(Boolean)
        )
        .takeUntilBy(this._stopper)
        .onValue(() => {
          if(this._activatedWhileLoading){
            const activeAddOnIcon = addonSidebarContainerEl.querySelector('.J-KU-KO');
            if(activeAddOnIcon) simulateClick(activeAddOnIcon);
            return;
          }

          this._setShouldAppSidebarOpen(false);

          const activeInstanceId = el.getAttribute('data-active-instance-id');
          if(activeInstanceId){
            if(addonSidebarContainerEl) addonSidebarContainerEl.classList.remove('app_sidebar_visible');
            el.removeAttribute('data-active-instance-id');
          }
        });
    }
  }

  addSidebarContentPanel(descriptor: Kefir.Observable<Object>) {
    const panel = new ContentPanelViewDriver(this._driver, descriptor, this._instanceId);

    this._stopper
      .takeUntilBy(panel.getStopper())
      .onValue(() => {
        panel.remove();
      });

    this._panels.set(panel.getInstanceId(), panel);

    return panel;
  }


}

export default defn(module, GmailAppSidebarView);
