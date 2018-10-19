/* @flow */

/*
This is used for PRE MATERIAL GMAIL, when sidebar only existed on threads.
If you're reading this in the future, do you remember a time when there wasn't a global sidebar?
It was a strange world, can you believe who the President of the United States was?

*/

import findIndex from 'lodash/findIndex';
import asap from 'asap';
import {defn} from 'ud';
import autoHtml from 'auto-html';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import kefirBus from 'kefir-bus';
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
import {simulateClick} from '../../../lib/dom/simulate-mouse-event';
import fakeWindowResize from '../../../lib/fake-window-resize';
import type GmailDriver from '../gmail-driver';

import AppSidebar from '../../../driver-common/sidebar/AppSidebar';
import ContentPanelViewDriver from '../../../driver-common/sidebar/ContentPanelViewDriver';
import GmailElementGetter from '../gmail-element-getter';

import addIconArea from './gmail-thread-sidebar-view/add-icon-area';
import addToIconArea from './gmail-app-sidebar-view/primary/add-to-icon-area';

const ADD_ON_SIDEBAR_CONTENT_SELECTOR = '.J-KU-Jz';
const ACTIVE_ADD_ON_ICON_SELECTOR = '.J-KU-KO';

import type WidthManager from './gmail-thread-view/width-manager';

class GmailAppSidebarView {
  _stopper = kefirStopper();
  _driver: GmailDriver;
  _instanceId: string;

  constructor(
    driver: GmailDriver,
    sidebarContainerEl?: ?HTMLElement,
    addonSidebarElement: ?HTMLElement,
    widthManager: ?WidthManager
  ) {
    this._driver = driver;

    // We need to be able to cooperate with other apps/extensions that are
    // sharing the app sidebar. We store some properties as attributes in the
    // shared DOM instead of as class properties; class properties are mostly
    // restricted to being used for references to DOM nodes. When
    // GmailAppSidebarView is instantiated, we check the element for an
    // attribute to see whether a previous extension's GmailAppSidebarView has
    // already set up the sidebar or not.
    const idElement = addonSidebarElement || sidebarContainerEl;
    if(!idElement) throw new Error('should not happen');
    const instanceId = idElement.getAttribute('data-sdk-sidebar-instance-id');
    if (instanceId != null) {
      this._instanceId = instanceId;
    } else {
      this._createElement(sidebarContainerEl, addonSidebarElement, widthManager);
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
    return global.localStorage.getItem('inboxsdk__app_sidebar_should_open') !== 'false';
  }

  _setShouldAppSidebarOpen(open: boolean) {
    try {
      global.localStorage.setItem('inboxsdk__app_sidebar_should_open', String(open));
    } catch(err) {
      console.error('error saving', err); //eslint-disable-line no-console
    }
  }

  _createElement(_sidebarContainerEl: ?HTMLElement, _addonSidebarContainerEl: ?HTMLElement, widthManager: ?WidthManager) {
    let container, iconArea;
    let component: AppSidebar;

    this._instanceId = `${Date.now()}-${Math.random()}`;

    {
      const idElement = _addonSidebarContainerEl || _sidebarContainerEl;
      if(!idElement) throw new Error('should not happen');
      idElement.setAttribute('data-sdk-sidebar-instance-id', this._instanceId);
      this._stopper.onValue(() => {
        idElement.removeAttribute('data-sdk-sidebar-instance-id');
      });
    }

    const el = document.createElement('div');
    el.className = idMap('app_sidebar_container');

    const buttonContainers: Map<string, HTMLElement> = new Map();
    let activatedWhileLoading: boolean = false;

    let contentContainer;
    let usedAddonsSidebar = false;

    const updateHighlightedAppIconBus = kefirBus();
    this._stopper.onEnd(() => {updateHighlightedAppIconBus.end();});

    if(_addonSidebarContainerEl){
      const mainContentBodyContainerElement = GmailElementGetter.getMainContentBodyContainerElement();
      if(mainContentBodyContainerElement){
        contentContainer = mainContentBodyContainerElement.parentElement;
        if(!contentContainer) throw new Error('should not happen');
        contentContainer.classList.add('container_app_sidebar_in_use');
        querySelector(_addonSidebarContainerEl, ADD_ON_SIDEBAR_CONTENT_SELECTOR).insertAdjacentElement('beforebegin', el);

        // See if the element is visible.
        // Give it some content temporarily to check if it becomes sized to show it.
        _addonSidebarContainerEl.classList.add('app_sidebar_visible');
        _addonSidebarContainerEl.classList.add(idMap('app_sidebar_in_use'));
        contentContainer.classList.add('container_app_sidebar_visible');

        el.textContent = 'x';
        const elRect = el.getBoundingClientRect();
        el.textContent = '';
        // This gets re-added later once the panel has some content to show
        _addonSidebarContainerEl.classList.remove('app_sidebar_visible');
        contentContainer.classList.remove('container_app_sidebar_visible');

        const supportedScreenSize = window.innerWidth >= 1024 && window.innerHeight >= 600;
        if (!global._APP_SIDEBAR_TEST && (
          elRect.width == 0 ||
          elRect.height == 0 ||
          (supportedScreenSize && Math.floor(elRect.right) > Math.floor(window.innerWidth))
        )) {
          this._driver.getLogger().error(new Error('SDK sidebar inserted into add-ons sidebar was not visible'), {
            rect: { // rect's properties aren't enumerable so we have to do this
              top: elRect.top,
              bottom: elRect.bottom,
              left: elRect.left,
              right: elRect.right,
              width: elRect.width,
              height: elRect.height
            },
            window: {
              innerWidth: window.innerWidth,
              innerHeight: window.innerHeight
            }
          });
        }
        else {
          usedAddonsSidebar = true;
        }

        if (!usedAddonsSidebar) {
          if(contentContainer) contentContainer.classList.remove('container_app_sidebar_in_use');
          _addonSidebarContainerEl.classList.remove(idMap('app_sidebar_in_use'));
        }
      }
    }

    const addonSidebarContainerEl = usedAddonsSidebar ? _addonSidebarContainerEl : null;
    const sidebarContainerEl = usedAddonsSidebar ? _addonSidebarContainerEl : _sidebarContainerEl;
    if(!sidebarContainerEl) throw new Error('should not happen');
    if (!usedAddonsSidebar) {
      sidebarContainerEl.insertBefore(el, sidebarContainerEl.firstElementChild);
      sidebarContainerEl.classList.add(idMap('app_sidebar_in_use'));
    }

    if (!((document.body:any):HTMLElement).querySelector('.'+idMap('app_sidebar_waiting_platform'))) {
      const waitingPlatform = document.createElement('div');
      waitingPlatform.className = idMap('app_sidebar_waiting_platform');
      ((document.body:any):HTMLElement).appendChild(waitingPlatform);
    }

    if(addonSidebarContainerEl) {
      container = () => el;
      el.classList.add('addon_sidebar');
    }
    else {
      const containerEl = findParent(sidebarContainerEl, el => window.getComputedStyle(el).overflowY !== 'visible');
      container = containerEl ? (() => containerEl) : undefined;
    }

    const currentIds = new Set();
    const orderManager = new OrderManager({
      get() {
        try {
          return JSON.parse(global.localStorage.getItem('inboxsdk__sidebar_ordering') || 'null');
        } catch (err) {
          console.error('failed to read sidebar order data', err); //eslint-disable-line no-console
        }
      },
      set(data) {
        try {
          global.localStorage.setItem('inboxsdk__sidebar_ordering', JSON.stringify(data));
        } catch (err) {
          console.error('failed to set sidebar order data', err); //eslint-disable-line no-console
        }
      }
    });

    updateHighlightedAppIconBus
      .bufferWithTimeOrCount(150, 100)
      .filter(events => events.length > 0)
      .takeUntilBy(this._stopper)
      .onValue(() => {
        const elBoundingBox = el.getBoundingClientRect();
        const boundingTop = elBoundingBox.top + el.scrollTop;
        const boundingBottom = boundingTop + elBoundingBox.height;

        const titleBars = Array.from(el.querySelectorAll(`.${idMap('app_sidebar_content_panel')}.${idMap('expanded')} .${idMap('app_sidebar_content_panel_top_line')}`));

        const titleBar = titleBars.find(t => {
          const tBoundingBox = t.getBoundingClientRect();
          return tBoundingBox.bottom > boundingTop && tBoundingBox.bottom < boundingBottom;
        });

        if(titleBar){
          const instanceId = titleBar.getAttribute('data-instance-id');
          const appName = titleBar.getAttribute('data-app-name');
          if(!appName) return;
          const appButton = buttonContainers.get(appName);
          if(!appButton || !iconArea) return;

          const activeButtonContainer = iconArea.querySelector('.sidebar_button_container_active');
          if(activeButtonContainer){
            activeButtonContainer.classList.remove('sidebar_button_container_active');
          }

          appButton.classList.add('sidebar_button_container_active');
        }
      });

    const _appSidebarRefSetter = threadSidebarComponent => {
      if (threadSidebarComponent) {
        component = threadSidebarComponent;
      }
    };

    const render = () => {
      ReactDOM.render(
        <AppSidebar
          ref={_appSidebarRefSetter}
          panels={orderManager.getOrderedItems().map(x => x.value)}
          onMoveEnd={(newList, movedItem, oldIndex, newIndex) => {
            orderManager.moveItem(oldIndex, newIndex);
            render();
          }}
          onExpandedToggle={() => {updateHighlightedAppIconBus.emit(null);}}
          container={container}
        />,
        el,
        () => {updateHighlightedAppIconBus.emit(null);}
      );
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
          contentContainer.classList.remove('container_app_sidebar_visible');
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

        const appName = event.detail.appName;
        orderManager.addItem({
          groupId: event.detail.appId,
          id,
          orderHint: event.detail.orderHint,
          value: {
            id, appName,
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
          iconArea = document.createElement('div');
          iconArea.className = idMap('sidebar_iconArea');
          addIconArea(iconArea, addonSidebarContainerEl, this._stopper);
        }

        // we put adding the content panel icon in the iconArea in an asap so that we
        // get consistent ordering. The ordering of the icons is based on the position of the FIRST
        // panel with that app name. This means we need to wait for all the panels for a particular appName
        // to be added first, and then we can get the correct position
        asap(() => {
          if(!iconArea) throw new Error('should not happen');
          const instanceId = event.detail.instanceId;
          const appIconUrl = event.detail.appIconUrl;

          // If there's an existing button for the app, then just increment its
          // data-count attribute instead of adding a new button.
          const existingButtonContainer = buttonContainers.get(appName);

          let buttonContainer;
          if (existingButtonContainer) {
            const currentCount = Number(existingButtonContainer.getAttribute('data-count')) || 1;
            existingButtonContainer.setAttribute('data-count', String(currentCount+1));
            buttonContainer = existingButtonContainer;
          } else {
            buttonContainer = document.createElement('div');
            buttonContainer.className = idMap('sidebar_button_container');
            buttonContainer.setAttribute('data-app-name', appName);
            buttonContainer.setAttribute('data-count', String(1));
            buttonContainer.innerHTML = autoHtml `
              <button class="inboxsdk__button_icon" type="button" data-tooltip="${appName}">
                <img class="inboxsdk__button_iconImg" src="${appIconUrl}">
              </button>
              <div class="inboxsdk__button_selectedIndicator"></div>
            `;

            if(event.detail.primaryColor){
              querySelector(buttonContainer, '.inboxsdk__button_selectedIndicator').style.backgroundColor = event.detail.primaryColor;
            }

            buttonContainers.set(appName, buttonContainer);

            querySelector(buttonContainer, 'button').addEventListener('click', (event: MouseEvent) => {
              event.stopPropagation();

              const activeButtonContainer = iconArea ? iconArea.querySelector('.sidebar_button_container_active') : null;
              if(activeButtonContainer){
                activeButtonContainer.classList.remove('sidebar_button_container_active');
              }

              if(activeButtonContainer === buttonContainer) {
                if(addonSidebarContainerEl) addonSidebarContainerEl.classList.remove('app_sidebar_visible');
                if(contentContainer) contentContainer.classList.remove('container_app_sidebar_visible');

                this._setShouldAppSidebarOpen(false);
              }
              else {
                if(addonSidebarContainerEl) addonSidebarContainerEl.classList.add('app_sidebar_visible');
                buttonContainer.classList.add('sidebar_button_container_active');
                if(contentContainer) contentContainer.classList.add('container_app_sidebar_visible');

                this._setShouldAppSidebarOpen(true);

                if(addonSidebarContainerEl) {
                  // check and deactivate add-on sidebar
                  const activeAddOnIcon = addonSidebarContainerEl.querySelector(ACTIVE_ADD_ON_ICON_SELECTOR);
                  if(activeAddOnIcon) simulateClick(activeAddOnIcon);

                  //fake resize to get gmail to fix any heights that are messed up
                  fakeWindowResize();

                  // if the tabList is still loading then handle the case where the user
                  // clicks on an SDK icon to bring up an SDK app when Gmail thinks that it needs
                  // to bring up an Add-On sidebar (since that was last visible from Gmail's perspective)
                  // so we need to suppress Gmail bringing up their sidebar. This handles the flag of if we
                  // need to suppress
                  const nativeIconArea = addonSidebarContainerEl.firstElementChild;
                  if(!nativeIconArea) return;
                  const loadingHolderAsAny: any = nativeIconArea.firstElementChild;
                  const loadingHolder = (loadingHolderAsAny: ?HTMLElement);
                  if(!loadingHolder) return;

                  if(loadingHolder.style.display !== 'none'){
                    activatedWhileLoading = true;
                    makeMutationObserverChunkedStream(loadingHolder, {attributes: true, attributeFilter: ['style']})
                      .toProperty(() => null)
                      .map(() => loadingHolder.style.display === 'none')
                      .filter(Boolean)
                      .take(1)
                      .delay(150)
                      .takeUntilBy(this._stopper)
                      .onValue(() => {
                        activatedWhileLoading = false;
                      });
                  }
                }

                component.openPanel(instanceId);
                component.scrollPanelIntoView(instanceId, true);
              }
            }, true);


            if(iconArea) addToIconArea(orderManager, appName, buttonContainer, iconArea);

            if(widthManager) widthManager.fixWidths();

            if(this._getShouldAppSidebarOpen()){
              // if we last had an SDK sidebar open then bring up the SDK sidebar when the first
              // panel gets added
              const activeButtonContainer = iconArea.querySelector('.sidebar_button_container_active');
              if(!activeButtonContainer){
                buttonContainer.classList.add('sidebar_button_container_active');

                if(addonSidebarContainerEl) addonSidebarContainerEl.classList.add('app_sidebar_visible');
                if(contentContainer) contentContainer.classList.add('container_app_sidebar_visible');

                //fake resize to get gmail to fix any heights that are messed up
                fakeWindowResize();
              }
            }
          }

        });
      });

    Kefir.fromEvents((document.body:any), 'inboxsdkUpdateSidebarPanel')
      .filter(e => e.detail.sidebarId === this._instanceId)
      .takeUntilBy(this._stopper)
      .onValue(event => {
        const orderedItems = orderManager.getOrderedItems();
        const index = findIndex(orderedItems, x => x.value.instanceId === event.detail.instanceId);
        if (index === -1) throw new Error('should not happen: failed to find orderItem');
        orderManager.updateItemValueByIndex(index, {
          id: orderedItems[index].value.id,
          appId: event.detail.appId,
          appName: event.detail.appName || event.detail.title,
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
        const index = findIndex(orderedItems, x => x.value.instanceId === event.detail.instanceId);
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

        if(widthManager) widthManager.fixWidths();

        const appName = event.detail.appName;

        const container = buttonContainers.get(appName);
        if(container){
          const currentCount = Number(container.getAttribute('data-count'));
          if (currentCount <= 1) {
            const activeButtonContainer = el.querySelector('.sidebar_button_container_active');
            container.remove();
            buttonContainers.delete(appName);
            if(container === activeButtonContainer){
              if(addonSidebarContainerEl){
                addonSidebarContainerEl.classList.remove('app_sidebar_visible');
                if(contentContainer) contentContainer.classList.remove('container_app_sidebar_visible');
              }

              this._setShouldAppSidebarOpen(false);
            }
          } else if (currentCount === 2) {
            container.removeAttribute('data-count');
          } else {
            container.setAttribute('data-count', String(currentCount-1));
          }
        }
      });

    Kefir.fromEvents((document.body:any), 'inboxsdkSidebarPanelScrollIntoView')
      .takeUntilBy(this._stopper)
      .onValue(event => {
        component.scrollPanelIntoView(event.detail.instanceId);
      });

    Kefir.fromEvents((document.body:any), 'inboxsdkSidebarPanelClose')
      .takeUntilBy(this._stopper)
      .onValue(event => {
        component.closePanel(event.detail.instanceId);
      });

    if(addonSidebarContainerEl){
      // listen for add-on sidebar contents to become visible which can happen in 1 of two cases
      //  1. user clicks on an Add-Icon icon
      //  2. Gmail automatically opens an Add-on sidebar because it was last open in previous thread
      const addonSidebarContentContainerElement = querySelector(addonSidebarContainerEl, ADD_ON_SIDEBAR_CONTENT_SELECTOR);
      makeElementChildStream(addonSidebarContentContainerElement)
        .flatMap(({el, removalStream}) =>
          makeMutationObserverChunkedStream(el, {attributes: true, attributeFilter: ['style']})
            .toProperty(() => null)
            .map(() => el.style.display !== 'none')
        )
        .takeUntilBy(this._stopper)
        .onValue((isDisplayingGmailAddonSidebar) => {
          if(isDisplayingGmailAddonSidebar){
            if(contentContainer) contentContainer.classList.add('container_addon_sidebar_visible');

            // we need to suppress this sidebar from loading
            if(activatedWhileLoading){
              const activeAddOnIcon = addonSidebarContainerEl.querySelector(ACTIVE_ADD_ON_ICON_SELECTOR);
              if(activeAddOnIcon) simulateClick(activeAddOnIcon);
              return;
            }

            this._setShouldAppSidebarOpen(false);

            const activeButtonContainer = iconArea ? iconArea.querySelector('.sidebar_button_container_active') : null;
            if(activeButtonContainer){
              addonSidebarContainerEl.classList.remove('app_sidebar_visible');
              activeButtonContainer.classList.remove('sidebar_button_container_active');
              if(contentContainer) contentContainer.classList.remove('container_app_sidebar_visible');
            }
          }
          else {
            if(contentContainer) contentContainer.classList.remove('container_addon_sidebar_visible');
          }
        });
    }

    if(addonSidebarContainerEl){
      //listen for scroll and update active icon if needed
      Kefir.fromEvents(el, 'scroll')
        .takeUntilBy(this._stopper)
        .onValue(() => {updateHighlightedAppIconBus.emit(null);});
    }
  }

  addSidebarContentPanel(descriptor: Kefir.Observable<Object>) {
    const panel = new ContentPanelViewDriver(this._driver, descriptor, this._instanceId);

    this._stopper
      .takeUntilBy(panel.getStopper())
      .onValue(() => {
        panel.remove();
      });

    return panel;
  }


}

export default defn(module, GmailAppSidebarView);
