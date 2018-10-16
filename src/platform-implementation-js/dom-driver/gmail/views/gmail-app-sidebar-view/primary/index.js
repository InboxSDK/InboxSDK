/* @flow */

import find from 'lodash/find';
import findIndex from 'lodash/findIndex';
import {defn} from 'ud';
import udKefir from 'ud-kefir';
import autoHtml from 'auto-html';
import asap from 'asap';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import OrderManager from 'order-manager';

import React from 'react';
import ReactDOM from 'react-dom';

import AppSidebar from '../../../../../driver-common/sidebar/AppSidebar';

import type GmailDriver from '../../../gmail-driver';
import GmailElementGetter from '../../../gmail-element-getter';
import idMap from '../../../../../lib/idMap';
import incrementName from '../../../../../lib/incrementName';
import querySelector from '../../../../../lib/dom/querySelectorOrFail';
import makeMutationObserverChunkedStream from '../../../../../lib/dom/make-mutation-observer-chunked-stream';
import makeElementChildStream from '../../../../../lib/dom/make-element-child-stream';
import {simulateClick} from '../../../../../lib/dom/simulate-mouse-event';
import fakeWindowResize from '../../../../../lib/fake-window-resize';

import addCompanionThreadIconArea from './add-companion-thread-icon-area';
import addCompanionGlobalIconArea from './add-companion-global-icon-area';
import addToIconArea from './add-to-icon-area';

const ACTIVE_ADD_ON_ICON_SELECTOR = '.J-KU-KO';
const ACTIVE_GLOBAL_ADD_ON_CLASS_NAME = 'bse-bvF-I-KO';
const ACTIVE_GLOBAL_ADD_ON_ICON_SELECTOR = `.${ACTIVE_GLOBAL_ADD_ON_CLASS_NAME}`;
const GLOBAL_ADD_ON_ICON_SELECTOR = '.bse-bvF-I';
const COMPANION_SIDEBAR_CONTENT_CLOSED_SHADOW_CLASS = 'brC-brG-btc';

const updates: Kefir.Observable<null> = udKefir(module, null);

// Only one instance of this Primary is ever created within a page, even if
// there are multiple InboxSDK instances and/or extensions. All other InboxSDK
// instances (including from other extensions) communicate with this Primary
// through DOM events.
class GmailAppSidebarPrimary {
  _stopper = kefirStopper();

  // There could be multiple InboxSDK instances (and therefore GmailDrivers)
  // talking to this Primary, so we shouldn't privilege the specific GmailDriver
  // that happened to create the Primary. Only use this GmailDriver for
  // logging-related functionality!
  _driver: GmailDriver;

  // This Primary has an identifier used by the DOM events to specify they're
  // talking to this Primary. This leaves us some room for having multiple
  // Primary instances (representing different visual locations in Gmail) or
  // multiple classes that make use of the same DOM events, but we don't make
  // use of that now. Mainly I didn't want to risk baking in the singleton
  // nature too deeply; that always seems to bite me.
  _instanceId: string = `${Date.now()}-${Math.random()}`;

  _companionSidebarContentContainerEl: HTMLElement;

  constructor(
    driver: GmailDriver,
    companionSidebarContentContainerElement: HTMLElement
  ) {
    this._driver = driver;
    this._companionSidebarContentContainerEl = companionSidebarContentContainerElement;
    this._setupElement();

    // hot reloading support
    updates.changes().onValue(() => {
      this._stopper.destroy();
      this._stopper = kefirStopper();

      this._setupElement();
    });
  }

  getInstanceId(): string {
    return this._instanceId;
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

  _setupElement() {
    let threadIconArea, globalIconArea;
    let shouldRestoreGlobal = false;
    let lastActiveNativeGlobalAddOnIconEl = null;
    let threadSidebarComponent: ?AppSidebar;
    const instanceIdsToDescriptors: Map<string, Object> = new Map();

    const companionSidebarIconContainerEl = GmailElementGetter.getCompanionSidebarIconContainerElement();
    if(!companionSidebarIconContainerEl) throw new Error('Could not find companion sidebar icon container element');

    this._instanceId = `${Date.now()}-${Math.random()}`;

    this._companionSidebarContentContainerEl.setAttribute('data-sdk-sidebar-instance-id', this._instanceId);

    // TODO: Once the changes to the GMail DOM have been entirely ramped, drop the ternary here and
    // always get the parentElement. (Jun 20, 2018)
    const companionSidebarOuterWrapper = this._companionSidebarContentContainerEl.classList.contains('bq9')
      ? this._companionSidebarContentContainerEl
      : this._companionSidebarContentContainerEl.parentElement;

    if (!companionSidebarOuterWrapper) throw new Error('should not happen: failed to find companionSidebarOuterWrapper');

    let threadSidebarContainerEl, renderThreadSidebar;
    const createThreadSidebar = () => {
      if(threadSidebarContainerEl) return threadSidebarContainerEl;

      const updateHighlightedAppThreadIconBus = kefirBus();
      const container = () => threadSidebarContainerEl;

      threadSidebarContainerEl = document.createElement('div');
      threadSidebarContainerEl.classList.add('thread_app_sidebar', idMap('app_sidebar_container'), 'addon_sidebar');

      this._companionSidebarContentContainerEl.insertBefore(threadSidebarContainerEl, this._companionSidebarContentContainerEl.firstElementChild);

      updateHighlightedAppThreadIconBus
        .bufferWithTimeOrCount(150, 100)
        .filter(events => events.length > 0)
        .takeUntilBy(this._stopper)
        .onValue(() => {
          // Before touching this code, make sure you understand the meaning of the clientRect
          // values and of scrollTop. In particular, make sure you understand the distinction of
          // absolute (the scroll[Top|Bottom|Height] values) vs relative (the BoundingRect top
          // and bottom values) scroll values.
          // https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect
          // https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollTop

          const containerBoundingBox = threadSidebarContainerEl.getBoundingClientRect();
          const titleBars = Array.from(threadSidebarContainerEl.querySelectorAll(`.${idMap('app_sidebar_content_panel')}.${idMap('expanded')} .${idMap('app_sidebar_content_panel_top_line')}`));

          const absoluteScrollOfViewportTop = threadSidebarContainerEl.scrollTop;
          const absoluteScrollOfViewportMidpoint = absoluteScrollOfViewportTop + (containerBoundingBox.height / 2);

          let titleBar = titleBars.find(t => {
            const tBoundingBox = t.getBoundingClientRect();

            const relativeScrollOfTitleBottom = tBoundingBox.bottom;
            const absoluteScrollOfTitleBottom = relativeScrollOfTitleBottom + absoluteScrollOfViewportTop;

            // Return true for an element that is below the top of the viewport but above its midpoint
            return absoluteScrollOfTitleBottom > absoluteScrollOfViewportTop
              && absoluteScrollOfTitleBottom < absoluteScrollOfViewportMidpoint;
          });

          // If titleBar is falsey then there isn't a title element in the top half of the viewport.
          // In this case, find the first title element above the viewport.
          if (!titleBar) {
            // We make the assumption here that ordering of the elements in titleBars matches the
            // ordering of how they appear in the sidebar (i.e. their ordering from top to bottom).
            let lastElementAboveViewPort;
            for (let i = 0; i < titleBars.length; i++) {
              const tElement = titleBars[i];
              const tBoundingBox = tElement.getBoundingClientRect();

              const relativeScrollOfTitleBottom = tBoundingBox.bottom;
              if (relativeScrollOfTitleBottom < 0) {
                lastElementAboveViewPort = tElement;
              }
              else if (relativeScrollOfTitleBottom > 0) {
                break;
              }
            }

            titleBar = lastElementAboveViewPort;
          }

          if(titleBar){
            const instanceId = titleBar.getAttribute('data-instance-id');
            const appName = titleBar.getAttribute('data-app-name');
            if(!appName) return;
            const appButton = threadButtonContainers.get(appName);
            if(!appButton || !threadIconArea) return;

            const activeButtonContainer = threadIconArea.querySelector('.sidebar_button_container_active');
            if(activeButtonContainer){
              activeButtonContainer.classList.remove('sidebar_button_container_active');
            }

            appButton.classList.add('sidebar_button_container_active');
          }
        });

      //listen for scroll and update active icon if needed
      Kefir.fromEvents(threadSidebarContainerEl, 'scroll')
        .onValue(() => {updateHighlightedAppThreadIconBus.emit(null);});

      // handle rendering thread sidebar contents
      renderThreadSidebar = () => {
        return new Promise((resolve) => {
          threadSidebarComponent = (ReactDOM.render(
            <AppSidebar
              panels={orderManager.getOrderedItems().map(x => x.value)}
              onMoveEnd={(newList, movedItem, oldIndex, newIndex) => {
                orderManager.moveItem(oldIndex, newIndex);
                renderThreadSidebar();
              }}
              onExpandedToggle={() => {updateHighlightedAppThreadIconBus.emit(null);}}
              container={container}
            />,
            threadSidebarContainerEl,
            () => {
              resolve();
              updateHighlightedAppThreadIconBus.emit(null);
            }
          ): any);
        });
      };
      renderThreadSidebar();
    };

    const addButton = (iconArea, event, isGlobal) => {
      // we put adding the content panel icon in the iconArea in an asap so that we
      // get consistent ordering. The ordering of the icons is based on the position of the FIRST
      // panel with that app name. This means we need to wait for all the panels for a particular appName
      // to be added first, and then we can get the correct position
      asap(() => {
        if(!iconArea) throw new Error('should not happen');

        const instanceId = event.detail.instanceId;
        const iconUrl = isGlobal && event.detail.iconUrl ? event.detail.iconUrl : event.detail.appIconUrl;
        const appName = event.detail.appName;
        const iconClass = event.detail.iconClass || '';

        // If there's an existing button for the app, then just increment its
        // data-count attribute instead of adding a new button.
        const existingButtonContainer = isGlobal ? globalButtonContainers.get(appName) : threadButtonContainers.get(appName);

        let buttonContainer;
        if (existingButtonContainer) {
          const currentCount = Number(existingButtonContainer.getAttribute('data-count')) || 1;
          existingButtonContainer.setAttribute('data-count', String(currentCount+1));
          buttonContainer = existingButtonContainer;
        } else {
          buttonContainer = document.createElement('div');
          buttonContainer.className = idMap('sidebar_button_container');
          buttonContainer.setAttribute('data-app-name', appName);
          buttonContainer.innerHTML = autoHtml `
            <button class="inboxsdk__button_icon ${iconClass}" type="button" data-tooltip="${appName}">
              <img class="inboxsdk__button_iconImg" src="${iconUrl}">
            </button>
            <div class="inboxsdk__button_selectedIndicator"></div>
          `;

          if(event.detail.primaryColor){
            querySelector(buttonContainer, '.inboxsdk__button_selectedIndicator').style.backgroundColor = event.detail.primaryColor;
          }

          if(isGlobal) globalButtonContainers.set(appName, buttonContainer);
          else threadButtonContainers.set(appName, buttonContainer);

          querySelector(buttonContainer, 'button').addEventListener('click', (event: MouseEvent) => {
            event.stopPropagation();

            let activeButtonContainer;
            if(globalIconArea) activeButtonContainer = globalIconArea.querySelector('.sidebar_button_container_active');
            if(!activeButtonContainer && threadIconArea) activeButtonContainer = threadIconArea.querySelector('.sidebar_button_container_active');

            if(activeButtonContainer === buttonContainer) {
              if(activeButtonContainer) closeSidebarAndDeactivateButton(activeButtonContainer);
              if(isGlobal){
                shouldRestoreGlobal = false;
                lastActiveNativeGlobalAddOnIconEl = null;
                this._setShouldGlobalAppSidebarOpen(false);

                const contentEl = contentContainers.get(appName);
                if(contentEl) contentEl.style.display = 'none';

                ((document.body:any):HTMLElement).dispatchEvent(
                  new CustomEvent('inboxsdkSidebarPanelDeactivated', {
                    bubbles: true, cancelable: false,
                    detail: {instanceId}
                  })
                );
              }
              else {
                this._setShouldThreadAppSidebarOpen(false);
              }
            }
            else {
              if(isGlobal) this._setShouldGlobalAppSidebarOpen(true);
              else this._setShouldThreadAppSidebarOpen(true);

              openSidebarAndActivateButton(buttonContainer, isGlobal);

              if(isGlobal){
                lastActiveNativeGlobalAddOnIconEl = querySelector(buttonContainer, 'button');
                const contentEl = contentContainers.get(appName);
                if(contentEl) contentEl.style.display = '';
                this._companionSidebarContentContainerEl.classList.add('companion_global_app_sidebar_visible');

                // let app listen for activate event
                ((document.body:any):HTMLElement).dispatchEvent(
                  new CustomEvent('inboxsdkSidebarPanelActivated', {
                    bubbles: true, cancelable: false,
                    detail: {instanceId}
                  })
                );
              }
              else {
                if(lastActiveNativeGlobalAddOnIconEl) shouldRestoreGlobal = true;
                if(threadSidebarComponent) {
                  threadSidebarComponent.openPanel(instanceId);
                  threadSidebarComponent.scrollPanelIntoView(instanceId, true);
                }
              }
            }

            //fake resize to get gmail to fix any heights that are messed up
            fakeWindowResize();
          }, true);


          if(iconArea) addToIconArea(orderManager, appName, buttonContainer, iconArea);

          // if we last had an SDK sidebar open then bring up the SDK sidebar when the first
          // panel gets added
          {
            let activeButtonContainer;
            if(isGlobal && this._getShouldGlobalAppSidebarOpen()){
              if(threadIconArea) activeButtonContainer = threadIconArea.querySelector('.sidebar_button_container_active');
              if(!activeButtonContainer && globalIconArea) activeButtonContainer = globalIconArea.querySelector('.sidebar_button_container_active');
              if(!activeButtonContainer) simulateClick(querySelector(buttonContainer, 'button'));
            }
            else if(!isGlobal && this._getShouldThreadAppSidebarOpen()){
              if(threadIconArea) activeButtonContainer = threadIconArea.querySelector('.sidebar_button_container_active');
              if(!activeButtonContainer) {
                openSidebarAndActivateButton(buttonContainer, isGlobal);

                if(lastActiveNativeGlobalAddOnIconEl) shouldRestoreGlobal = true;
              }
            }
          }
        }

      });
    };

    const removeButton = (event, buttonContainers, iconArea) => {
      const appName = event.detail.appName;

      const container = buttonContainers.get(appName);
      if(!iconArea || !container) return;

      const currentCount = Number(container.getAttribute('data-count'));
      if (currentCount <= 1) {
        const activeButtonContainer = iconArea.querySelector('.sidebar_button_container_active');
        container.remove();
        buttonContainers.delete(appName);
        if(container === activeButtonContainer){
          companionSidebarOuterWrapper.classList.remove('companion_app_sidebar_wrapper_visible');
          this._companionSidebarContentContainerEl.classList.remove('companion_app_sidebar_visible');
          const contentContainer = companionSidebarOuterWrapper.previousElementSibling;
          if(contentContainer) contentContainer.classList.remove('companion_container_app_sidebar_visible');

          if(shouldRestoreGlobal && lastActiveNativeGlobalAddOnIconEl) {
            const activeElementToRestore = document.activeElement;
            if(activeElementToRestore){
              // if the global sidebar we're putting back is tasks then tasks puts focus on it
              // when you click the button, so we keep putting back focus on the element that had focus
              // before restoring that global sidebar
              // we add the delay because if we restore focus synchronously then the focus that the gmail tasks
              // sidebar calls fires AFTER the 'blur' event loop, and so activeElementToRestore.focus doesn't
              // do anything
              Kefir.fromEvents(activeElementToRestore, 'blur')
                .delay(5)
                .takeUntilBy(Kefir.later(300))
                .onValue(() => {
                  activeElementToRestore.focus();
                });
            }
            simulateClick(lastActiveNativeGlobalAddOnIconEl);
          }
        }
      } else if (currentCount === 2) {
        container.removeAttribute('data-count');
      } else {
        container.setAttribute('data-count', String(currentCount-1));
      }
    };

    const closeSidebarAndDeactivateButton = (activeButtonContainer) => {
      activeButtonContainer.classList.remove('sidebar_button_container_active');
      companionSidebarOuterWrapper.classList.remove('companion_app_sidebar_wrapper_visible');
      this._companionSidebarContentContainerEl.classList.add(COMPANION_SIDEBAR_CONTENT_CLOSED_SHADOW_CLASS);
      this._companionSidebarContentContainerEl.classList.remove('companion_app_sidebar_visible', 'companion_global_app_sidebar_visible');

      const contentContainer = companionSidebarOuterWrapper.previousElementSibling;
      if(contentContainer) contentContainer.classList.remove('companion_container_app_sidebar_visible');
    };

    const openSidebarAndActivateButton = (buttonContainer, isGlobal) => {
      let activeButtonContainer;
      if(globalIconArea) activeButtonContainer = globalIconArea.querySelector('.sidebar_button_container_active');
      if(!activeButtonContainer && threadIconArea) activeButtonContainer = threadIconArea.querySelector('.sidebar_button_container_active');

      if(activeButtonContainer) closeSidebarAndDeactivateButton(activeButtonContainer);

      const activeGlobalAddOnIcon = companionSidebarIconContainerEl.querySelector(ACTIVE_GLOBAL_ADD_ON_ICON_SELECTOR);
      if(activeGlobalAddOnIcon) {
        simulateClick(activeGlobalAddOnIcon);
        // we put this in a setTimeout because the simulate click will
        // trigger a mutation observer that is listening to native sidebar visibility
        // and will set lastActiveNativeGlobalAddOnIconEl to null
        // which we don't actually want to do, so we set it back
        if(!isGlobal){
          setTimeout(() => {
            lastActiveNativeGlobalAddOnIconEl = activeGlobalAddOnIcon;
            shouldRestoreGlobal = true;
          }, 1);
        }
      }

      const activeThreadAddOnIcon = companionSidebarIconContainerEl.querySelector(ACTIVE_ADD_ON_ICON_SELECTOR);
      if (activeThreadAddOnIcon) simulateClick(activeThreadAddOnIcon);

      buttonContainer.classList.add('sidebar_button_container_active');
      companionSidebarOuterWrapper.classList.add('companion_app_sidebar_wrapper_visible');
      this._companionSidebarContentContainerEl.classList.add('companion_app_sidebar_visible');
      this._companionSidebarContentContainerEl.classList.remove(COMPANION_SIDEBAR_CONTENT_CLOSED_SHADOW_CLASS);

      const contentContainer = companionSidebarOuterWrapper.previousElementSibling;
      if (contentContainer) contentContainer.classList.add('companion_container_app_sidebar_visible');
      if (isGlobal) this._companionSidebarContentContainerEl.classList.add('companion_global_app_sidebar_visible');
    };

    const globalButtonContainers: Map<string, HTMLElement> = new Map();
    const threadButtonContainers: Map<string, HTMLElement> = new Map();
    const contentContainers: Map<string, HTMLElement> = new Map();

    const contentContainer = companionSidebarOuterWrapper.previousElementSibling;
    if(contentContainer) contentContainer.classList.add(idMap('companion_container_app_sidebar_in_use'));
    this._companionSidebarContentContainerEl.classList.add(idMap('app_sidebar_in_use'));

    if (!((document.body:any):HTMLElement).querySelector('.'+idMap('app_sidebar_waiting_platform'))) {
      const waitingPlatform = document.createElement('div');
      waitingPlatform.className = idMap('app_sidebar_waiting_platform');
      ((document.body:any):HTMLElement).appendChild(waitingPlatform);
    }


    // keep track of what is the last active native global addon
    // so that we can restore that state if they leave the thread while the SDK sidebar
    // is open
    Array.from(companionSidebarIconContainerEl.querySelectorAll(GLOBAL_ADD_ON_ICON_SELECTOR))
      .forEach(addonIconEl => {
        makeMutationObserverChunkedStream(addonIconEl, {
          attributes: true,
          attributeFilter: ['class']
        })
        .takeUntilBy(this._stopper)
        .toProperty(() => null)
        .onValue(() => {
          const isActive = addonIconEl.classList.contains(ACTIVE_GLOBAL_ADD_ON_CLASS_NAME);

          if(isActive){
            lastActiveNativeGlobalAddOnIconEl = addonIconEl;
            shouldRestoreGlobal = true;
          }
          else if(lastActiveNativeGlobalAddOnIconEl === addonIconEl) {
            lastActiveNativeGlobalAddOnIconEl = null;
            shouldRestoreGlobal = false;
          }
        });
      });

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

    // thread sidebar content panels
    {
      Kefir.fromEvents(window, 'storage')
        .filter(e => e.key === 'inboxsdk__sidebar_ordering')
        .takeUntilBy(this._stopper)
        .onValue(() => {
          orderManager.reload();
          if(renderThreadSidebar) renderThreadSidebar();
        });

      Kefir.fromEvents((document.body:any), 'inboxsdkNewSidebarPanel')
        .filter(e => e.detail.sidebarId === this._instanceId && !e.detail.isGlobal)
        .takeUntilBy(this._stopper)
        .onValue(event => {
          createThreadSidebar();
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
          if(renderThreadSidebar) renderThreadSidebar();

          threadIconArea = companionSidebarIconContainerEl.querySelector('.sidebar_thread_iconArea');
          if (!threadIconArea) {
            threadIconArea = document.createElement('div');
            threadIconArea.className = idMap('sidebar_iconArea');
            threadIconArea.classList.add('sidebar_thread_iconArea');
            addCompanionThreadIconArea(this._driver.getLogger(), threadIconArea, companionSidebarIconContainerEl);
          }

          addButton(threadIconArea, event, false);
        });

      Kefir.fromEvents((document.body:any), 'inboxsdkUpdateSidebarPanel')
        .filter(e => e.detail.sidebarId === this._instanceId && !e.detail.isGlobal)
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
          if(renderThreadSidebar) renderThreadSidebar();
        });

      Kefir.fromEvents((document.body:any), 'inboxsdkRemoveSidebarPanel')
        .filter(e => e.detail.sidebarId === this._instanceId && !e.detail.isGlobal)
        .takeUntilBy(this._stopper)
        .onValue(event => {
          const orderedItems = orderManager.getOrderedItems();
          const index = findIndex(orderedItems, x => x.value.instanceId === event.detail.instanceId);
          if (index === -1) throw new Error('should not happen: failed to find orderItem');
          currentIds.delete(orderedItems[index].id);
          orderManager.removeItemByIndex(index);

          if(renderThreadSidebar) renderThreadSidebar();
          removeButton(event, threadButtonContainers, threadIconArea);
        });

      Kefir.fromEvents((document.body:any), 'inboxsdkSidebarPanelScrollIntoView')
        .filter(e => e.detail.sidebarId === this._instanceId && !e.detail.isGlobal)
        .takeUntilBy(this._stopper)
        .onValue(event => {
          if(threadSidebarComponent) threadSidebarComponent.scrollPanelIntoView(event.detail.instanceId);
        });

      Kefir.fromEvents((document.body:any), 'inboxsdkSidebarPanelClose')
        .filter(e => e.detail.sidebarId === this._instanceId && !e.detail.isGlobal)
        .takeUntilBy(this._stopper)
        .onValue(event => {
          if(threadSidebarComponent) threadSidebarComponent.closePanel(event.detail.instanceId);
        });

      Kefir.fromEvents((document.body:any), 'inboxsdkSidebarPanelOpen')
        .filter(e => e.detail.sidebarId === this._instanceId && !e.detail.isGlobal)
        .takeUntilBy(this._stopper)
        .onValue(e => {
          if (renderThreadSidebar) {
            renderThreadSidebar()
              .then(() => {
                this._setShouldThreadAppSidebarOpen(true);

                const appName = find(orderManager.getOrderedItems(), item => item.value.instanceId === e.detail.instanceId).value.appName;
                const buttonContainer = threadButtonContainers.get(appName);
                if (buttonContainer) {
                  openSidebarAndActivateButton(buttonContainer, e.detail.isGlobal);
                } else {
                  throw new Error('missing button container');
                }

                if (threadSidebarComponent) {
                  threadSidebarComponent.openPanel(e.detail.instanceId);
                  threadSidebarComponent.scrollPanelIntoView(e.detail.instanceId, true);
                }
              });
          }
        });
    }


    // global sidebar content panels
    {
      Kefir.fromEvents((document.body:any), 'inboxsdkNewSidebarPanel')
        .filter(e => e.detail.sidebarId === this._instanceId && e.detail.isGlobal)
        .takeUntilBy(this._stopper)
        .onValue(event => {
          let id = event.detail.id;
          while (currentIds.has(id)) {
            id = incrementName(id);
          }
          currentIds.add(id);

          const appName = event.detail.appName;

          globalIconArea = companionSidebarIconContainerEl.querySelector('.sidebar_global_iconArea');
          if (!globalIconArea) {
            globalIconArea = document.createElement('div');
            globalIconArea.className = idMap('sidebar_iconArea');
            globalIconArea.classList.add('sidebar_global_iconArea');
            addCompanionGlobalIconArea(this._driver.getLogger(), globalIconArea, companionSidebarIconContainerEl);
          }

          const sdkContentContainerEl = document.createElement('div');
          sdkContentContainerEl.classList.add('addon_sidebar', idMap('app_sidebar_container'), 'global_app_sidebar');
          this._companionSidebarContentContainerEl.insertAdjacentElement('afterbegin', sdkContentContainerEl);
          contentContainers.set(appName, sdkContentContainerEl);

          sdkContentContainerEl.appendChild(event.target);
          sdkContentContainerEl.style.display = 'none';

          addButton(globalIconArea, event, true);
        });

      Kefir.fromEvents((document.body:any), 'inboxsdkUpdateSidebarPanel')
        .filter(e => e.detail.sidebarId === this._instanceId && e.detail.isGlobal)
        .takeUntilBy(this._stopper)
        .onValue(event => {
          const buttonContainer = globalButtonContainers.get(event.detail.appName);
          if(!buttonContainer) return;

          const iconClass = event.detail.iconClass || '';
          const iconUrl = event.detail.iconUrl || event.detail.appIconUrl;

          const imgElement = querySelector(buttonContainer, 'img');
          imgElement.setAttribute('src', iconUrl);

          const button = querySelector(buttonContainer, 'button');
          button.setAttribute('class', `inboxsdk__button_icon ${iconClass}`);
        });

      Kefir.fromEvents((document.body:any), 'inboxsdkRemoveSidebarPanel')
        .filter(e => e.detail.sidebarId === this._instanceId && e.detail.isGlobal)
        .takeUntilBy(this._stopper)
        .onValue(event => {
          currentIds.delete(event.detail.id);
          removeButton(event, globalButtonContainers, globalIconArea);
        });

      Kefir.fromEvents((document.body:any), 'inboxsdkSidebarPanelClose')
        .filter(e => e.detail.sidebarId === this._instanceId && e.detail.isGlobal)
        .takeUntilBy(this._stopper)
        .onValue(event => {
          const descriptor = instanceIdsToDescriptors.get(event.detail.instanceId);
          if(!descriptor) return;

          const buttonContainer = globalButtonContainers.get(descriptor.appName);
          if(!buttonContainer) return;

          let activeButtonContainer;
          if(globalIconArea){
            activeButtonContainer = globalIconArea.querySelector('.sidebar_button_container_active');
          }

          if(activeButtonContainer === buttonContainer){
            simulateClick(querySelector(buttonContainer, 'button'));
          }
        });

      Kefir.fromEvents((document.body:any), 'inboxsdkSidebarPanelOpen')
        .filter(e => e.detail.sidebarId === this._instanceId && e.detail.isGlobal)
        .takeUntilBy(this._stopper)
        .onValue(event => {
          const descriptor = instanceIdsToDescriptors.get(event.detail.instanceId);
          if(!descriptor) return;

          const buttonContainer = globalButtonContainers.get(descriptor.appName);
          if(!buttonContainer) return;

          let activeButtonContainer;
          if(globalIconArea){
            activeButtonContainer = globalIconArea.querySelector('.sidebar_button_container_active');
          }

          if(activeButtonContainer !== buttonContainer){
            simulateClick(querySelector(buttonContainer, 'button'));
          }
        });
    }

    // instance id to descriptor management
    {
      Kefir.fromEvents((document.body:any), 'inboxsdkNewSidebarPanel')
        .filter(e => e.detail.sidebarId === this._instanceId)
        .takeUntilBy(this._stopper)
        .onValue(event => {
          instanceIdsToDescriptors.set(event.detail.instanceId, event.detail);
        });

      Kefir.fromEvents((document.body:any), 'inboxsdkRemoveSidebarPanel')
        .filter(e => e.detail.sidebarId === this._instanceId)
        .takeUntilBy(this._stopper)
        .onValue(event => {
          instanceIdsToDescriptors.delete(event.detail.instanceId);
        });

      Kefir.fromEvents((document.body:any), 'inboxsdkUpdateSidebarPanel')
        .filter(e => e.detail.sidebarId === this._instanceId)
        .takeUntilBy(this._stopper)
        .onValue(event => {
          instanceIdsToDescriptors.set(event.detail.instanceId, event.detail);
        });
    }

    // at this point the companionSidebar has 2 children
    // 1st child is global add-on content
    // 2nd is thread add-on content (may not exist)

    // listen for companion sidebar contents to become visible
    // this happens when ONE of the global add-on content element
    // or the thread add-on content element are visible
    // if they are both display: '' or display: none then the native sidebar
    // contents are not visible
    const globalAddOnContentContainer = this._companionSidebarContentContainerEl.children[0];
    const threadAddOnContentContainer = this._companionSidebarContentContainerEl.children[1];

    Kefir.merge(
        [globalAddOnContentContainer, threadAddOnContentContainer].map(addonContentEl => (
          makeMutationObserverChunkedStream(addonContentEl, {
            attributes: true,
            attributeFilter: ['style']
          })
        ))
      )
      .filter(() => (
        globalAddOnContentContainer.style.display !== threadAddOnContentContainer.style.display
      ))
      .takeUntilBy(this._stopper)
      .onValue(() => {
        let activeButtonContainer;
        if(threadIconArea) activeButtonContainer = threadIconArea.querySelector('.sidebar_button_container_active');
        if(!activeButtonContainer && globalIconArea) activeButtonContainer = globalIconArea.querySelector('.sidebar_button_container_active');

        if(activeButtonContainer) {

          simulateClick(querySelector(activeButtonContainer, 'button'));
        }
      });
  }
}

export default defn(module, GmailAppSidebarPrimary);
