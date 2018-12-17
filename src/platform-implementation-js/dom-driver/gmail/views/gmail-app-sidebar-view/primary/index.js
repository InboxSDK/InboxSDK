/* @flow */

import find from 'lodash/find';
import findIndex from 'lodash/findIndex';
import { defn } from 'ud';
import autoHtml from 'auto-html';
import asap from 'asap';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type { Bus } from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import OrderManager from 'order-manager';

import React from 'react';
import ReactDOM from 'react-dom';

import AppSidebar from '../../../../../driver-common/sidebar/AppSidebar';
import type {PanelDescriptor} from '../../../../../driver-common/sidebar/AppSidebar';

import type GmailDriver from '../../../gmail-driver';
import GmailElementGetter from '../../../gmail-element-getter';
import idMap from '../../../../../lib/idMap';
import incrementName from '../../../../../lib/incrementName';
import querySelector from '../../../../../lib/dom/querySelectorOrFail';
import makeMutationObserverChunkedStream from '../../../../../lib/dom/make-mutation-observer-chunked-stream';
import makeElementChildStream from '../../../../../lib/dom/make-element-child-stream';
import { simulateClick } from '../../../../../lib/dom/simulate-mouse-event';
import fakeWindowResize from '../../../../../lib/fake-window-resize';

import addCompanionThreadIconArea from './add-companion-thread-icon-area';
import addCompanionGlobalIconArea from './add-companion-global-icon-area';
import addToIconArea from './add-to-icon-area';

const ACTIVE_ADD_ON_ICON_SELECTOR = '.aT5-aOt-I-KO';
const COMPANION_SIDEBAR_CONTENT_CLOSED_SHADOW_CLASS = 'brC-brG-btc';

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
  _instanceIdsToDescriptors: Map<string, Object> = new Map();

  _threadSidebarComponent: ?AppSidebar = null;

  _threadIconArea: ?HTMLElement = null;
  _globalIconArea: ?HTMLElement = null;

  _globalButtonContainers: Map<string, HTMLElement> = new Map();
  _threadButtonContainers: Map<string, HTMLElement> = new Map();
  _contentContainers: Map<string, HTMLElement> = new Map();

  _threadSidebarContainerEl: ?HTMLElement = null;
  _companionSidebarOuterWrapper: HTMLElement;

  _currentIds: Set<string> = new Set();

  _orderManager = new OrderManager<PanelDescriptor>({
    get() {
      try {
        return JSON.parse(
          global.localStorage.getItem('inboxsdk__sidebar_ordering') || 'null'
        );
      } catch (err) {
        console.error('failed to read sidebar order data', err); //eslint-disable-line no-console
      }
    },
    set(data) {
      try {
        global.localStorage.setItem(
          'inboxsdk__sidebar_ordering',
          JSON.stringify(data)
        );
      } catch (err) {
        console.error('failed to set sidebar order data', err); //eslint-disable-line no-console
      }
    }
  });

  _containerProp: () => HTMLElement;
  _updateHighlightedAppThreadIconBus: Bus<null> = kefirBus();

  constructor(
    driver: GmailDriver,
    companionSidebarContentContainerElement: HTMLElement
  ) {
    this._driver = driver;
    this._companionSidebarContentContainerEl = companionSidebarContentContainerElement;
    this._setupElement();
  }

  getInstanceId(): string {
    return this._instanceId;
  }

  // Only use this if a different Primary needs to take over this one's elements.
  // Currently this is only done when hot-reloading in dev. Don't use this when
  // a threadview exits, the sdk.destroy() is called, etc.
  destroy() {
    this._stopper.destroy();
  }

  // This value controls whether the app sidebar should automatically open
  // itself when available when the chat sidebar isn't present. It's only set
  // if the user interacts with the app sidebar button.
  _getShouldGlobalAppSidebarOpen(): boolean {
    return (
      global.localStorage.getItem(
        'inboxsdk__global_app_sidebar_should_open'
      ) === 'true'
    );
  }

  _setShouldGlobalAppSidebarOpen(open: boolean) {
    try {
      global.localStorage.setItem(
        'inboxsdk__global_app_sidebar_should_open',
        String(open)
      );
    } catch (err) {
      console.error('error saving', err); //eslint-disable-line no-console
    }
  }

  _getShouldThreadAppSidebarOpen(): boolean {
    return (
      global.localStorage.getItem(
        'inboxsdk__thread_app_sidebar_should_open'
      ) !== 'false'
    );
  }

  _setShouldThreadAppSidebarOpen(open: boolean) {
    try {
      global.localStorage.setItem(
        'inboxsdk__thread_app_sidebar_should_open',
        String(open)
      );
    } catch (err) {
      console.error('error saving', err); //eslint-disable-line no-console
    }
  }

  _createThreadSidebarIfNeeded(): HTMLElement {
    if (this._threadSidebarContainerEl) return this._threadSidebarContainerEl;

    const threadSidebarContainerEl = (this._threadSidebarContainerEl = document.createElement(
      'div'
    ));
    threadSidebarContainerEl.classList.add(
      'thread_app_sidebar',
      idMap('app_sidebar_container'),
      'addon_sidebar'
    );

    this._companionSidebarContentContainerEl.insertBefore(
      threadSidebarContainerEl,
      this._companionSidebarContentContainerEl.firstElementChild
    );

    this._containerProp = () => threadSidebarContainerEl;

    // Kefir flow type def has wrong type for bufferWithTimeOrCount
    (this._updateHighlightedAppThreadIconBus: any)
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
        const titleBars = Array.from(
          threadSidebarContainerEl.querySelectorAll(
            `.${idMap('app_sidebar_content_panel')}.${idMap(
              'expanded'
            )} .${idMap('app_sidebar_content_panel_top_line')}`
          )
        );

        const absoluteScrollOfViewportTop = threadSidebarContainerEl.scrollTop;
        const absoluteScrollOfViewportMidpoint =
          absoluteScrollOfViewportTop + containerBoundingBox.height / 2;

        let titleBar = titleBars.find(t => {
          const tBoundingBox = t.getBoundingClientRect();

          const relativeScrollOfTitleBottom = tBoundingBox.bottom;
          const absoluteScrollOfTitleBottom =
            relativeScrollOfTitleBottom + absoluteScrollOfViewportTop;

          // Return true for an element that is below the top of the viewport but above its midpoint
          return (
            absoluteScrollOfTitleBottom > absoluteScrollOfViewportTop &&
            absoluteScrollOfTitleBottom < absoluteScrollOfViewportMidpoint
          );
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
            } else if (relativeScrollOfTitleBottom > 0) {
              break;
            }
          }

          titleBar = lastElementAboveViewPort;
        }

        if (titleBar) {
          const instanceId = titleBar.getAttribute('data-instance-id');
          const appName = titleBar.getAttribute('data-app-name');
          if (!appName) return;
          const appButton = this._threadButtonContainers.get(appName);
          if (!appButton || !this._threadIconArea) return;

          const activeButtonContainer = this._threadIconArea.querySelector(
            '.sidebar_button_container_active'
          );
          if (activeButtonContainer) {
            activeButtonContainer.classList.remove(
              'sidebar_button_container_active'
            );
          }

          appButton.classList.add('sidebar_button_container_active');
        }
      });

    //listen for scroll and update active icon if needed
    this._updateHighlightedAppThreadIconBus.plug(
      Kefir.fromEvents(threadSidebarContainerEl, 'scroll').map(() => null)
    );

    // handle rendering thread sidebar contents
    this._renderThreadSidebar();
    return threadSidebarContainerEl;
  }

  _renderThreadSidebarIfPresent() {
    if (!this._threadSidebarContainerEl) {
      return;
    }
    this._renderThreadSidebar();
  }

  _appSidebarRefSetter: (el: ?AppSidebar) => void = threadSidebarComponent => {
    if (threadSidebarComponent) {
      this._threadSidebarComponent = threadSidebarComponent;
    }
  };

  _renderThreadSidebar(): Promise<AppSidebar> {
    const threadSidebarContainerEl = this._threadSidebarContainerEl;
    if (!threadSidebarContainerEl) {
      throw new Error(
        '_renderThreadSidebar should not be called when _threadSidebarContainerEl is unset'
      );
    }
    return new Promise(resolve => {
      ReactDOM.render(
        <AppSidebar
          ref={this._appSidebarRefSetter}
          panels={this._orderManager.getOrderedItems().map(x => x.value)}
          onMoveEnd={(newList, movedItem, oldIndex, newIndex) => {
            this._orderManager.moveItem(oldIndex, newIndex);
            this._renderThreadSidebar();
          }}
          onExpandedToggle={() => {
            this._updateHighlightedAppThreadIconBus.emit(null);
          }}
          container={this._containerProp}
        />,
        threadSidebarContainerEl,
        () => {
          if (!this._threadSidebarComponent) {
            throw new Error('Should not happen');
          }
          resolve(this._threadSidebarComponent);
          this._updateHighlightedAppThreadIconBus.emit(null);
        }
      );
    });
  }

  _getActiveButtonContainer(): ?HTMLElement {
    let activeButtonContainer;
    if (this._globalIconArea) {
      activeButtonContainer = this._globalIconArea.querySelector(
        '.sidebar_button_container_active'
      );
    }
    if (!activeButtonContainer && this._threadIconArea) {
      activeButtonContainer = this._threadIconArea.querySelector(
        '.sidebar_button_container_active'
      );
    }
    return activeButtonContainer;
  }

  _closeButton: ?(userClick: boolean) => void = null;

  _addButton(iconArea: HTMLElement, event: Object, isGlobal: boolean) {
    // we put adding the content panel icon in the iconArea in an asap so that we
    // get consistent ordering. The ordering of the icons is based on the position of the FIRST
    // panel with that app name. This means we need to wait for all the panels for a particular appName
    // to be added first, and then we can get the correct position
    asap(() => {
      if (!iconArea) throw new Error('should not happen');

      const instanceId = event.detail.instanceId;
      const iconUrl =
        isGlobal && event.detail.iconUrl
          ? event.detail.iconUrl
          : event.detail.appIconUrl;
      const appName = event.detail.appName;
      const iconClass = event.detail.iconClass || '';

      // If there's an existing button for the app, then just increment its
      // data-count attribute instead of adding a new button.
      const existingButtonContainer = isGlobal
        ? this._globalButtonContainers.get(appName)
        : this._threadButtonContainers.get(appName);

      let buttonContainer;
      if (existingButtonContainer) {
        const currentCount =
          Number(existingButtonContainer.getAttribute('data-count')) || 1;
        existingButtonContainer.setAttribute(
          'data-count',
          String(currentCount + 1)
        );
        buttonContainer = existingButtonContainer;
      } else {
        buttonContainer = document.createElement('div');
        buttonContainer.className = idMap('sidebar_button_container');
        buttonContainer.setAttribute('data-app-name', appName);
        buttonContainer.innerHTML = autoHtml`
          <button class="inboxsdk__button_icon ${iconClass}" type="button" data-tooltip="${appName}">
            <img class="inboxsdk__button_iconImg" src="${iconUrl}">
          </button>
          <div class="inboxsdk__button_selectedIndicator"></div>
        `;

        if (event.detail.primaryColor) {
          querySelector(
            buttonContainer,
            '.inboxsdk__button_selectedIndicator'
          ).style.backgroundColor =
            event.detail.primaryColor;
        }

        if (isGlobal) {
          this._globalButtonContainers.set(appName, buttonContainer);
        } else {
          this._threadButtonContainers.set(appName, buttonContainer);
        }

        const activate = (dontScrollIntoView = false) => {
          const activeButtonContainer = this._getActiveButtonContainer();

          if (activeButtonContainer === buttonContainer) {
            // button was clicked while its panel was open, so close it.
            if (!this._closeButton) throw new Error();
            this._closeButton(true);
          } else {
            // button was clicked while its own panel wasn't open, so open it.

            if (this._closeButton) {
              this._closeButton(true);
            }

            if (isGlobal) this._setShouldGlobalAppSidebarOpen(true);
            else this._setShouldThreadAppSidebarOpen(true);

            this._openSidebarAndActivateButton(buttonContainer, isGlobal);

            if (isGlobal) {
              const contentEl = this._contentContainers.get(appName);
              if (contentEl) contentEl.style.display = '';
              this._companionSidebarContentContainerEl.classList.add(
                'companion_global_app_sidebar_visible'
              );

              // let app listen for activate event
              ((document.body: any): HTMLElement).dispatchEvent(
                new CustomEvent('inboxsdkSidebarPanelActivated', {
                  bubbles: true,
                  cancelable: false,
                  detail: { instanceId }
                })
              );
            } else {
              const threadSidebarComponent = this._threadSidebarComponent;
              if (!threadSidebarComponent) {
                throw new Error('sidebar not mounted');
              }
              if (!dontScrollIntoView) {
                threadSidebarComponent.openPanel(instanceId);
                threadSidebarComponent.scrollPanelIntoView(instanceId, true);
              }
            }

            this._closeButton = (userClick: boolean) => {
              this._closeButton = null;

              const activeButtonContainer = this._getActiveButtonContainer();
              if (!activeButtonContainer) {
                throw new Error('Expected activeButtonContainer');
              }
              this._closeSidebarAndDeactivateButton(activeButtonContainer);

              if (isGlobal) {
                if (userClick) this._setShouldGlobalAppSidebarOpen(false);

                const contentEl = this._contentContainers.get(appName);
                if (contentEl) {
                  contentEl.style.display = 'none';
                } else {
                  this._driver
                    .getLogger()
                    .error(new Error('Unexpected: contentEl not set'));
                }

                ((document.body: any): HTMLElement).dispatchEvent(
                  new CustomEvent('inboxsdkSidebarPanelDeactivated', {
                    bubbles: true,
                    cancelable: false,
                    detail: { instanceId }
                  })
                );
              } else {
                if (userClick) this._setShouldThreadAppSidebarOpen(false);
              }
            };
          }

          //fake resize to get gmail to fix any heights that are messed up
          fakeWindowResize();
        };

        querySelector(buttonContainer, 'button').addEventListener(
          'click',
          (event: MouseEvent) => {
            event.stopPropagation();
            activate();
          },
          true
        );

        if (iconArea) {
          addToIconArea(this._orderManager, appName, buttonContainer, iconArea);
        }

        // if we last had an SDK sidebar open then bring up the SDK sidebar when the first
        // panel gets added
        {
          const activeButtonContainer = this._getActiveButtonContainer();
          if (isGlobal) {
            if (this._getShouldGlobalAppSidebarOpen()) {
              const activeButtonContainerPresentAndIsForGlobal =
                this._globalIconArea &&
                activeButtonContainer &&
                this._globalIconArea.contains(activeButtonContainer);
              if (!activeButtonContainerPresentAndIsForGlobal) {
                activate(true);
              }
            }
          } else {
            if (this._getShouldThreadAppSidebarOpen()) {
              const activeButtonContainerPresentAndIsForThread =
                this._threadIconArea &&
                activeButtonContainer &&
                this._threadIconArea.contains(activeButtonContainer);
              if (!activeButtonContainerPresentAndIsForThread) {
                activate(true);
              }
            }
          }
        }
      }
    });
  }

  _removeButton(
    event: Object,
    buttonContainers: Map<string, HTMLElement>,
    iconArea: ?HTMLElement
  ) {
    const appName = event.detail.appName;

    const container = buttonContainers.get(appName);
    if (!iconArea || !container) {
      throw new Error(
        'should not happen: tried to remove button without container or iconArea'
      );
    }

    const currentCount = Number(container.getAttribute('data-count'));
    if (currentCount <= 1) {
      const activeButtonContainer = iconArea.querySelector(
        '.sidebar_button_container_active'
      );
      if (container === activeButtonContainer) {
        if (!this._closeButton) throw new Error();
        this._closeButton(false);

        this._companionSidebarOuterWrapper.classList.remove(
          'companion_app_sidebar_wrapper_visible'
        );
        this._companionSidebarContentContainerEl.classList.remove(
          'companion_app_sidebar_visible'
        );
        const contentContainer = this._companionSidebarOuterWrapper
          .previousElementSibling;
        if (contentContainer)
          contentContainer.classList.remove(
            'companion_container_app_sidebar_visible'
          );
      }
      container.remove();
      buttonContainers.delete(appName);
    } else if (currentCount === 2) {
      container.removeAttribute('data-count');
    } else {
      container.setAttribute('data-count', String(currentCount - 1));
    }
  }

  _closeSidebarAndDeactivateButton(activeButtonContainer: HTMLElement) {
    activeButtonContainer.classList.remove('sidebar_button_container_active');
    this._companionSidebarOuterWrapper.classList.remove(
      'companion_app_sidebar_wrapper_visible'
    );
    this._companionSidebarContentContainerEl.classList.add(
      COMPANION_SIDEBAR_CONTENT_CLOSED_SHADOW_CLASS
    );
    this._companionSidebarContentContainerEl.classList.remove(
      'companion_app_sidebar_visible',
      'companion_global_app_sidebar_visible'
    );

    const contentContainer = this._companionSidebarOuterWrapper
      .previousElementSibling;
    if (contentContainer)
      contentContainer.classList.remove(
        'companion_container_app_sidebar_visible'
      );
  }

  _openSidebarAndActivateButton(
    buttonContainer: HTMLElement,
    isGlobal: boolean
  ) {
    const companionSidebarIconContainerEl = GmailElementGetter.getCompanionSidebarIconContainerElement();
    if (!companionSidebarIconContainerEl)
      throw new Error(
        'Could not find companion sidebar icon container element'
      );

    const activeButtonContainer = this._getActiveButtonContainer();
    if (activeButtonContainer) {
      throw new Error('activeButtonContainer should not be true');
      // this._closeSidebarAndDeactivateButton(activeButtonContainer);
    }

    {
      // If a gmail addon is active, close it.
      const nativeActiveAddOnIcon = companionSidebarIconContainerEl.querySelector(
        ACTIVE_ADD_ON_ICON_SELECTOR
      );
      if (nativeActiveAddOnIcon) {
        simulateClick(nativeActiveAddOnIcon);
      }
    }

    buttonContainer.classList.add('sidebar_button_container_active');
    this._companionSidebarOuterWrapper.classList.add(
      'companion_app_sidebar_wrapper_visible'
    );
    this._companionSidebarContentContainerEl.classList.add(
      'companion_app_sidebar_visible'
    );
    this._companionSidebarContentContainerEl.classList.remove(
      COMPANION_SIDEBAR_CONTENT_CLOSED_SHADOW_CLASS
    );

    const contentContainer = this._companionSidebarOuterWrapper
      .previousElementSibling;
    if (contentContainer)
      contentContainer.classList.add('companion_container_app_sidebar_visible');
    if (isGlobal)
      this._companionSidebarContentContainerEl.classList.add(
        'companion_global_app_sidebar_visible'
      );
  }

  _setupElement() {
    const companionSidebarIconContainerEl = GmailElementGetter.getCompanionSidebarIconContainerElement();
    if (!companionSidebarIconContainerEl)
      throw new Error(
        'Could not find companion sidebar icon container element'
      );

    this._companionSidebarContentContainerEl.setAttribute(
      'data-sdk-sidebar-instance-id',
      this._instanceId
    );

    // TODO: Once the changes to the GMail DOM have been entirely ramped, drop the ternary here and
    // always get the parentElement. (Jun 20, 2018)
    this._companionSidebarOuterWrapper = this._companionSidebarContentContainerEl.classList.contains(
      'bq9'
    )
      ? this._companionSidebarContentContainerEl
      : (this._companionSidebarContentContainerEl.parentElement: any);

    if (!this._companionSidebarOuterWrapper) {
      throw new Error(
        'should not happen: failed to find companionSidebarOuterWrapper'
      );
    }

    const contentContainer = this._companionSidebarOuterWrapper
      .previousElementSibling;
    if (contentContainer) {
      contentContainer.classList.add(
        idMap('companion_container_app_sidebar_in_use')
      );
    }
    this._companionSidebarContentContainerEl.classList.add(
      idMap('app_sidebar_in_use')
    );

    if (
      !((document.body: any): HTMLElement).querySelector(
        '.' + idMap('app_sidebar_waiting_platform')
      )
    ) {
      const waitingPlatform = document.createElement('div');
      waitingPlatform.className = idMap('app_sidebar_waiting_platform');
      ((document.body: any): HTMLElement).appendChild(waitingPlatform);
    }

    // thread sidebar content panels
    {
      Kefir.fromEvents(window, 'storage')
        .filter(e => e.key === 'inboxsdk__sidebar_ordering')
        .takeUntilBy(this._stopper)
        .onValue(() => {
          this._orderManager.reload();
          this._renderThreadSidebarIfPresent();
        });

      Kefir.fromEvents((document.body: any), 'inboxsdkNewSidebarPanel')
        .filter(
          e => e.detail.sidebarId === this._instanceId && !e.detail.isGlobal
        )
        .takeUntilBy(this._stopper)
        .onValue(event => {
          this._createThreadSidebarIfNeeded();
          let id = event.detail.id;
          while (this._currentIds.has(id)) {
            id = incrementName(id);
          }
          this._currentIds.add(id);

          const appName = event.detail.appName;
          this._orderManager.addItem({
            groupId: event.detail.appId,
            id,
            orderHint: event.detail.orderHint,
            value: {
              id,
              appName,
              appId: event.detail.appId,
              instanceId: event.detail.instanceId,
              title: event.detail.title,
              iconClass: event.detail.iconClass,
              iconUrl: event.detail.iconUrl,
              hideTitleBar: event.detail.hideTitleBar,
              el: event.target
            }
          });
          this._renderThreadSidebar();

          let threadIconArea = (this._threadIconArea = companionSidebarIconContainerEl.querySelector(
            '.sidebar_thread_iconArea'
          ));
          if (!threadIconArea) {
            threadIconArea = this._threadIconArea = document.createElement(
              'div'
            );
            threadIconArea.className = idMap('sidebar_iconArea');
            threadIconArea.classList.add('sidebar_thread_iconArea');
            addCompanionThreadIconArea(
              this._driver.getLogger(),
              threadIconArea,
              companionSidebarIconContainerEl
            );
          }

          this._addButton(threadIconArea, event, false);
        });

      Kefir.fromEvents((document.body: any), 'inboxsdkUpdateSidebarPanel')
        .filter(
          e => e.detail.sidebarId === this._instanceId && !e.detail.isGlobal
        )
        .takeUntilBy(this._stopper)
        .onValue(event => {
          const orderedItems = this._orderManager.getOrderedItems();
          const index = findIndex(
            orderedItems,
            x => x.value.instanceId === event.detail.instanceId
          );
          if (index === -1)
            throw new Error('should not happen: failed to find orderItem');
          this._orderManager.updateItemValueByIndex(index, {
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
          this._renderThreadSidebar();
        });

      Kefir.fromEvents((document.body: any), 'inboxsdkRemoveSidebarPanel')
        .filter(
          e => e.detail.sidebarId === this._instanceId && !e.detail.isGlobal
        )
        .takeUntilBy(this._stopper)
        .onValue(event => {
          const orderedItems = this._orderManager.getOrderedItems();
          const index = findIndex(
            orderedItems,
            x => x.value.instanceId === event.detail.instanceId
          );
          if (index === -1)
            throw new Error('should not happen: failed to find orderItem');
          this._currentIds.delete(orderedItems[index].id);
          this._orderManager.removeItemByIndex(index);

          this._renderThreadSidebar();
          this._removeButton(
            event,
            this._threadButtonContainers,
            this._threadIconArea
          );
        });

      Kefir.fromEvents(
        (document.body: any),
        'inboxsdkSidebarPanelScrollIntoView'
      )
        .filter(
          e => e.detail.sidebarId === this._instanceId && !e.detail.isGlobal
        )
        .takeUntilBy(this._stopper)
        .onValue(event => {
          if (this._threadSidebarComponent)
            this._threadSidebarComponent.scrollPanelIntoView(
              event.detail.instanceId
            );
        });

      Kefir.fromEvents((document.body: any), 'inboxsdkSidebarPanelClose')
        .filter(
          e => e.detail.sidebarId === this._instanceId && !e.detail.isGlobal
        )
        .takeUntilBy(this._stopper)
        .onValue(event => {
          if (this._threadSidebarComponent)
            this._threadSidebarComponent.closePanel(event.detail.instanceId);
        });

      Kefir.fromEvents((document.body: any), 'inboxsdkSidebarPanelOpen')
        .filter(
          e => e.detail.sidebarId === this._instanceId && !e.detail.isGlobal
        )
        .takeUntilBy(this._stopper)
        .onValue(e => {
          this._renderThreadSidebar().then(threadSidebarComponent => {
            const descriptor = this._instanceIdsToDescriptors.get(
              e.detail.instanceId
            );
            if (!descriptor) return;

            const buttonContainer = this._threadButtonContainers.get(
              descriptor.appName
            );
            if (!buttonContainer) {
              throw new Error('missing button container');
            }
            const activeButtonContainer = this._getActiveButtonContainer();
            if (activeButtonContainer !== buttonContainer) {
              querySelector(buttonContainer, 'button').click();
            }
          });
        });
    }

    // global sidebar content panels
    {
      Kefir.fromEvents((document.body: any), 'inboxsdkNewSidebarPanel')
        .filter(
          e => e.detail.sidebarId === this._instanceId && e.detail.isGlobal
        )
        .takeUntilBy(this._stopper)
        .onValue(event => {
          let id = event.detail.id;
          while (this._currentIds.has(id)) {
            id = incrementName(id);
          }
          this._currentIds.add(id);

          const appName = event.detail.appName;

          let globalIconArea = (this._globalIconArea = companionSidebarIconContainerEl.querySelector(
            '.sidebar_global_iconArea'
          ));
          if (!globalIconArea) {
            globalIconArea = this._globalIconArea = document.createElement(
              'div'
            );
            globalIconArea.className = idMap('sidebar_iconArea');
            globalIconArea.classList.add('sidebar_global_iconArea');
            addCompanionGlobalIconArea(
              this._driver.getLogger(),
              globalIconArea,
              companionSidebarIconContainerEl
            );
          }

          const sdkContentContainerEl = document.createElement('div');
          sdkContentContainerEl.classList.add(
            'addon_sidebar',
            idMap('app_sidebar_container'),
            'global_app_sidebar'
          );
          this._companionSidebarContentContainerEl.insertAdjacentElement(
            'afterbegin',
            sdkContentContainerEl
          );
          this._contentContainers.set(appName, sdkContentContainerEl);

          sdkContentContainerEl.appendChild(event.target);
          sdkContentContainerEl.style.display = 'none';

          this._addButton(globalIconArea, event, true);
        });

      Kefir.fromEvents((document.body: any), 'inboxsdkUpdateSidebarPanel')
        .filter(
          e => e.detail.sidebarId === this._instanceId && e.detail.isGlobal
        )
        .takeUntilBy(this._stopper)
        .onValue(event => {
          const buttonContainer = this._globalButtonContainers.get(
            event.detail.appName
          );
          if (!buttonContainer) return;

          const iconClass = event.detail.iconClass || '';
          const iconUrl = event.detail.iconUrl || event.detail.appIconUrl;

          const imgElement = querySelector(buttonContainer, 'img');
          imgElement.setAttribute('src', iconUrl);

          const button = querySelector(buttonContainer, 'button');
          button.setAttribute('class', `inboxsdk__button_icon ${iconClass}`);
        });

      Kefir.fromEvents((document.body: any), 'inboxsdkRemoveSidebarPanel')
        .filter(
          e => e.detail.sidebarId === this._instanceId && e.detail.isGlobal
        )
        .takeUntilBy(this._stopper)
        .onValue(event => {
          this._currentIds.delete(event.detail.id);
          this._removeButton(
            event,
            this._globalButtonContainers,
            this._globalIconArea
          );
        });

      Kefir.fromEvents((document.body: any), 'inboxsdkSidebarPanelClose')
        .filter(
          e => e.detail.sidebarId === this._instanceId && e.detail.isGlobal
        )
        .takeUntilBy(this._stopper)
        .onValue(event => {
          const descriptor = this._instanceIdsToDescriptors.get(
            event.detail.instanceId
          );
          if (!descriptor) return;

          const buttonContainer = this._globalButtonContainers.get(
            descriptor.appName
          );
          if (!buttonContainer) return;

          const activeButtonContainer = this._getActiveButtonContainer();
          if (activeButtonContainer === buttonContainer) {
            if (!this._closeButton) {
              throw new Error('Expected this._closeButton');
            }
            this._closeButton(true);
          }
        });

      Kefir.fromEvents((document.body: any), 'inboxsdkSidebarPanelOpen')
        .filter(
          e => e.detail.sidebarId === this._instanceId && e.detail.isGlobal
        )
        .takeUntilBy(this._stopper)
        .onValue(event => {
          const descriptor = this._instanceIdsToDescriptors.get(
            event.detail.instanceId
          );
          if (!descriptor) return;

          const buttonContainer = this._globalButtonContainers.get(
            descriptor.appName
          );
          if (!buttonContainer) return;

          const activeButtonContainer = this._getActiveButtonContainer();
          if (activeButtonContainer !== buttonContainer) {
            querySelector(buttonContainer, 'button').click();
          }
        });
    }

    // instance id to descriptor management
    {
      Kefir.fromEvents((document.body: any), 'inboxsdkNewSidebarPanel')
        .filter(e => e.detail.sidebarId === this._instanceId)
        .takeUntilBy(this._stopper)
        .onValue(event => {
          this._instanceIdsToDescriptors.set(
            event.detail.instanceId,
            event.detail
          );
        });

      Kefir.fromEvents((document.body: any), 'inboxsdkRemoveSidebarPanel')
        .filter(e => e.detail.sidebarId === this._instanceId)
        .takeUntilBy(this._stopper)
        .onValue(event => {
          this._instanceIdsToDescriptors.delete(event.detail.instanceId);
        });

      Kefir.fromEvents((document.body: any), 'inboxsdkUpdateSidebarPanel')
        .filter(e => e.detail.sidebarId === this._instanceId)
        .takeUntilBy(this._stopper)
        .onValue(event => {
          this._instanceIdsToDescriptors.set(
            event.detail.instanceId,
            event.detail
          );
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
    const globalAddOnContentContainer = this._companionSidebarContentContainerEl
      .children[0];
    const threadAddOnContentContainer = this._companionSidebarContentContainerEl
      .children[1];

    Kefir.merge(
      [globalAddOnContentContainer, threadAddOnContentContainer].map(
        addonContentEl =>
          makeMutationObserverChunkedStream(addonContentEl, {
            attributes: true,
            attributeFilter: ['style']
          })
      )
    )
      .filter(
        () =>
          globalAddOnContentContainer.style.display !==
          threadAddOnContentContainer.style.display
      )
      .takeUntilBy(this._stopper)
      .onValue(() => {
        // TODO What is this block for? It closes the current section whenever
        // one of the Gmail addons bar elements changes?
        const activeButtonContainer = this._getActiveButtonContainer();
        if (activeButtonContainer) {
          querySelector(activeButtonContainer, 'button').click();
        }
      });
  }
}

export default defn(module, GmailAppSidebarPrimary);
