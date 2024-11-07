import findIndex from 'lodash/findIndex';
import asap from 'asap';
import * as Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type { Bus } from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import OrderManager from 'order-manager';
import React from 'react';
import ReactDOM from 'react-dom';
import AppSidebar from '../../../../../driver-common/sidebar/AppSidebar';
import type { PanelDescriptor } from '../../../../../driver-common/sidebar/AppSidebar';
import type GmailDriver from '../../../gmail-driver';
import GmailElementGetter from '../../../gmail-element-getter';
import idMap from '../../../../../lib/idMap';
import incrementName from '../../../../../lib/incrementName';
import querySelector from '../../../../../lib/dom/querySelectorOrFail';
import makeMutationObserverChunkedStream from '../../../../../lib/dom/make-mutation-observer-chunked-stream';
import { simulateClick } from '../../../../../lib/dom/simulate-mouse-event';
import fakeWindowResize from '../../../../../lib/fake-window-resize';
import addCompanionThreadIconArea from './add-companion-thread-icon-area';
import addCompanionGlobalIconArea from './add-companion-global-icon-area';
import addToIconArea from './add-to-icon-area';
import cx from 'classnames';
import {
  sidebarWaitingPlatformClassName,
  sidebarWaitingPlatformSelector,
} from '../../../../../driver-common/sidebar/constants';
import { type SidebarPanelEvent } from '../../../../../driver-common/sidebar/ContentPanelViewDriver';
import escape from 'lodash/escape';
import * as s from './index.module.css';

const ACTIVE_ADD_ON_ICON_SELECTOR = '.aT5-aOt-I-KO';
const COMPANION_SIDEBAR_CONTENT_CLOSED_SHADOW_CLASS = 'brC-brG-btc';

/** Only one instance of this Primary is ever created within a page, even if
 * there are multiple InboxSDK instances and/or extensions. All other InboxSDK
 * instances (including from other extensions) communicate with this Primary
 * through DOM events. */
class GmailAppSidebarPrimary {
  #stopper = kefirStopper();
  /**
   * There could be multiple InboxSDK instances (and therefore GmailDrivers)
   * talking to this Primary, so we shouldn't privilege the specific GmailDriver
   * that happened to create the Primary. Only use this GmailDriver for
   * logging-related functionality!
   */
  #driver: { getLogger: GmailDriver['getLogger'] };
  /**
   * This Primary has an identifier used by the DOM events to specify they're
   * talking to this Primary. This leaves us some room for having multiple
   * Primary instances (representing different visual locations in Gmail) or
   * multiple classes that make use of the same DOM events, but we don't make
   * use of that now. Mainly I didn't want to risk baking in the singleton
   * nature too deeply; that always seems to bite me.
   */
  #instanceId: string = `${Date.now()}-${Math.random()}`;
  #companionSidebarContentContainerEl: HTMLElement;
  #instanceIdsToDescriptors = new Map<string, SidebarPanelEvent>();
  #threadSidebarComponent: AppSidebar | null | undefined = null;
  #threadIconArea: HTMLElement | null | undefined = null;
  #globalIconArea: HTMLElement | null | undefined = null;
  #globalButtonContainers: Map<string, HTMLElement> = new Map();
  #threadButtonContainers: Map<string, HTMLElement> = new Map();
  #contentContainers: Map<string, HTMLElement> = new Map();
  #threadSidebarContainerEl: HTMLElement | null | undefined = null;
  #companionSidebarOuterWrapper!: HTMLElement;
  #currentIds: Set<string> = new Set();
  #orderManager = new OrderManager<PanelDescriptor>({
    get() {
      try {
        return JSON.parse(
          global.localStorage.getItem('inboxsdk__sidebar_ordering') || 'null',
        );
      } catch (err) {
        console.error('failed to read sidebar order data', err);
      }
    },

    set(data) {
      try {
        global.localStorage.setItem(
          'inboxsdk__sidebar_ordering',
          JSON.stringify(data),
        );
      } catch (err) {
        console.error('failed to set sidebar order data', err);
      }
    },
  });
  #containerProp!: () => HTMLElement;
  #updateHighlightedAppThreadIconBus: Bus<null, unknown> = kefirBus();

  constructor(
    driver: GmailDriver,
    companionSidebarContentContainerElement: HTMLElement,
  ) {
    this.#driver = driver;
    this.#companionSidebarContentContainerEl =
      companionSidebarContentContainerElement;

    this.#setupElement();
  }

  getInstanceId(): string {
    return this.#instanceId;
  }

  /**
   * Only use this if a different Primary needs to take over this one's elements.
   * Currently this is only done when hot-reloading in dev. Don't use this when
   * a threadview exits, the sdk.destroy() is called, etc.
   */
  destroy() {
    this.#stopper.destroy();
  }

  /**
   * This value controls whether the app sidebar should automatically open
   * itself when available when the chat sidebar isn't present. It's only set
   * if the user interacts with the app sidebar button.
   */
  #getShouldGlobalAppSidebarOpen(): boolean {
    return (
      global.localStorage.getItem(
        'inboxsdk__global_app_sidebar_should_open',
      ) === 'true'
    );
  }

  #setShouldGlobalAppSidebarOpen(open: boolean) {
    try {
      global.localStorage.setItem(
        'inboxsdk__global_app_sidebar_should_open',
        String(open),
      );
    } catch (err) {
      console.error('error saving', err);
    }
  }

  #getShouldThreadAppSidebarOpen(): boolean {
    return (
      global.localStorage.getItem(
        'inboxsdk__thread_app_sidebar_should_open',
      ) !== 'false'
    );
  }

  #setShouldThreadAppSidebarOpen(open: boolean) {
    try {
      global.localStorage.setItem(
        'inboxsdk__thread_app_sidebar_should_open',
        String(open),
      );
    } catch (err) {
      console.error('error saving', err);
    }
  }

  #createThreadSidebarIfNeeded(): HTMLElement {
    if (this.#threadSidebarContainerEl) return this.#threadSidebarContainerEl;
    const threadSidebarContainerEl = (this.#threadSidebarContainerEl =
      document.createElement('div'));
    threadSidebarContainerEl.classList.add(
      'thread_app_sidebar',
      idMap('app_sidebar_container'),
      'addon_sidebar',
    );

    this.#companionSidebarContentContainerEl.insertBefore(
      threadSidebarContainerEl,
      this.#companionSidebarContentContainerEl.firstElementChild,
    );

    this.#containerProp = () => threadSidebarContainerEl;

    this.#updateHighlightedAppThreadIconBus
      .bufferWithTimeOrCount(150, 100)
      .filter((events: any[]) => events.length > 0)
      .takeUntilBy(this.#stopper)
      .onValue(() => {
        // Before touching this code, make sure you understand the meaning of the clientRect
        // values and of scrollTop. In particular, make sure you understand the distinction of
        // absolute (the scroll[Top|Bottom|Height] values) vs relative (the BoundingRect top
        // and bottom values) scroll values.
        // https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect
        // https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollTop
        const containerBoundingBox =
          threadSidebarContainerEl.getBoundingClientRect();
        const titleBars = Array.from(
          threadSidebarContainerEl.querySelectorAll(
            `.${idMap('app_sidebar_content_panel')}.${idMap(
              'expanded',
            )} .${idMap('app_sidebar_content_panel_top_line')}`,
          ),
        );
        const absoluteScrollOfViewportTop = threadSidebarContainerEl.scrollTop;
        const absoluteScrollOfViewportMidpoint =
          absoluteScrollOfViewportTop + containerBoundingBox.height / 2;
        let titleBar = titleBars.find((t) => {
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
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const instanceId = titleBar.getAttribute('data-instance-id');
          const appName = titleBar.getAttribute('data-app-name');
          if (!appName) return;

          const appButton = this.#threadButtonContainers.get(appName);

          if (!appButton || !this.#threadIconArea) return;

          const activeButtonContainer = this.#threadIconArea.querySelector(
            '.sidebar_button_container_active',
          );

          if (activeButtonContainer) {
            activeButtonContainer.classList.remove(
              'sidebar_button_container_active',
            );
          }

          appButton.classList.add('sidebar_button_container_active');
        }
      });

    //listen for scroll and update active icon if needed
    this.#updateHighlightedAppThreadIconBus.plug(
      Kefir.fromEvents(threadSidebarContainerEl, 'scroll').map(() => null),
    );

    // handle rendering thread sidebar contents
    this.#renderThreadSidebar();

    return threadSidebarContainerEl;
  }

  #renderThreadSidebarIfPresent() {
    if (!this.#threadSidebarContainerEl) {
      return;
    }

    this.#renderThreadSidebar();
  }

  #appSidebarRefSetter: (el: AppSidebar | null | undefined) => void = (
    threadSidebarComponent,
  ) => {
    if (threadSidebarComponent) {
      this.#threadSidebarComponent = threadSidebarComponent;
    }
  };

  #renderThreadSidebar(): Promise<AppSidebar> {
    const threadSidebarContainerEl = this.#threadSidebarContainerEl;

    if (!threadSidebarContainerEl) {
      throw new Error(
        '_renderThreadSidebar should not be called when _threadSidebarContainerEl is unset',
      );
    }

    return new Promise((resolve) => {
      ReactDOM.render(
        <AppSidebar
          ref={this.#appSidebarRefSetter}
          panels={this.#orderManager.getOrderedItems().map((x) => x.value)}
          onMoveEnd={(newList, movedItem, oldIndex, newIndex) => {
            this.#orderManager.moveItem(oldIndex, newIndex);

            this.#renderThreadSidebar();
          }}
          onExpandedToggle={() => {
            this.#updateHighlightedAppThreadIconBus.emit(null);
          }}
          container={this.#containerProp}
        />,
        threadSidebarContainerEl,
        () => {
          if (!this.#threadSidebarComponent) {
            throw new Error('Should not happen');
          }

          resolve(this.#threadSidebarComponent);

          this.#updateHighlightedAppThreadIconBus.emit(null);
        },
      );
    });
  }

  #getActiveButtonContainer(): HTMLElement | null | undefined {
    let activeButtonContainer;

    if (this.#globalIconArea) {
      activeButtonContainer = this.#globalIconArea.querySelector<HTMLElement>(
        '.sidebar_button_container_active',
      );
    }

    if (!activeButtonContainer && this.#threadIconArea) {
      activeButtonContainer = this.#threadIconArea.querySelector<HTMLElement>(
        '.sidebar_button_container_active',
      );
    }

    return activeButtonContainer;
  }

  #closeButton: ((userClick: boolean) => void) | null | undefined = null;

  #addButton(
    iconArea: HTMLElement,
    event: CustomEvent<SidebarPanelEvent>,
    isGlobal: boolean,
  ) {
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
      const { iconClass = '', iconLiga } = event.detail;

      // If there's an existing button for the app, then just increment its
      // data-count attribute instead of adding a new button.
      const existingButtonContainer = isGlobal
        ? this.#globalButtonContainers.get(appName)
        : this.#threadButtonContainers.get(appName);
      let buttonContainer: HTMLElement;

      if (existingButtonContainer) {
        const currentCount =
          Number(existingButtonContainer.getAttribute('data-count')) || 1;
        existingButtonContainer.setAttribute(
          'data-count',
          String(currentCount + 1),
        );
        buttonContainer = existingButtonContainer;
      } else {
        buttonContainer = document.createElement('div');
        buttonContainer.className = idMap('sidebar_button_container');
        buttonContainer.setAttribute('data-app-name', appName);
        buttonContainer.innerHTML = `
          <button class="inboxsdk__button_icon ${escape(
            iconClass,
          )}" type="button" data-tooltip="${escape(appName)}">
            ${
              iconLiga
                ? `<span class="${escape(s.iconLiga)}">${escape(
                    iconLiga,
                  ).trim()}</div>`
                : `<img class="inboxsdk__button_iconImg" src="${escape(
                    iconUrl,
                  )}">`
            }
          </button>
          <div class="inboxsdk__button_selectedIndicator"></div>
        `;

        if (event.detail.primaryColor) {
          querySelector(
            buttonContainer,
            '.inboxsdk__button_selectedIndicator',
          ).style.backgroundColor = event.detail.primaryColor;
        }

        if (isGlobal) {
          this.#globalButtonContainers.set(appName, buttonContainer);
        } else {
          this.#threadButtonContainers.set(appName, buttonContainer);
        }

        const activate = (dontScrollIntoView = false) => {
          const activeButtonContainer = this.#getActiveButtonContainer();

          if (activeButtonContainer === buttonContainer) {
            // button was clicked while its panel was open, so close it.
            if (!this.#closeButton) throw new Error();

            this.#closeButton(true);
          } else {
            // button was clicked while its own panel wasn't open, so open it.
            if (this.#closeButton) {
              this.#closeButton(true);
            }

            if (isGlobal) this.#setShouldGlobalAppSidebarOpen(true);
            else this.#setShouldThreadAppSidebarOpen(true);

            this.#openSidebarAndActivateButton(buttonContainer, isGlobal);

            if (isGlobal) {
              const contentEl = this.#contentContainers.get(appName);

              if (contentEl) contentEl.style.display = '';

              this.#companionSidebarContentContainerEl.classList.add(
                'companion_global_app_sidebar_visible',
              );

              // let app listen for activate event
              document.body.dispatchEvent(
                new CustomEvent('inboxsdkSidebarPanelActivated', {
                  bubbles: true,
                  cancelable: false,
                  detail: {
                    instanceId,
                  },
                }),
              );
            } else {
              const threadSidebarComponent = this.#threadSidebarComponent;

              if (!threadSidebarComponent) {
                throw new Error('sidebar not mounted');
              }

              if (!dontScrollIntoView) {
                threadSidebarComponent.openPanel(instanceId);
                threadSidebarComponent.scrollPanelIntoView(instanceId, true);
              }
            }

            this.#closeButton = (userClick: boolean) => {
              this.#closeButton = null;

              const activeButtonContainer = this.#getActiveButtonContainer();

              if (!activeButtonContainer) {
                throw new Error('Expected activeButtonContainer');
              }

              this.#closeSidebarAndDeactivateButton(activeButtonContainer);

              if (isGlobal) {
                if (userClick) this.#setShouldGlobalAppSidebarOpen(false);

                const contentEl = this.#contentContainers.get(appName);

                if (contentEl) {
                  contentEl.style.display = 'none';
                } else {
                  this.#driver
                    .getLogger()
                    .error(new Error('Unexpected: contentEl not set'));
                }

                document.body.dispatchEvent(
                  new CustomEvent('inboxsdkSidebarPanelDeactivated', {
                    bubbles: true,
                    cancelable: false,
                    detail: {
                      instanceId,
                    },
                  }),
                );
              } else {
                if (userClick) this.#setShouldThreadAppSidebarOpen(false);
              }

              //fake a window resize after closing so gmail fixes any heights that are messed up
              fakeWindowResize();
            };

            //fake a window resize after opening so gmail fixes any heights that are messed up
            fakeWindowResize();
          }
        };

        querySelector(buttonContainer, 'button').addEventListener(
          'click',
          (event: MouseEvent) => {
            event.stopPropagation();
            activate();
          },
          true,
        );

        if (iconArea) {
          addToIconArea(this.#orderManager, appName, buttonContainer, iconArea);
        }

        // if we last had an SDK sidebar open then bring up the SDK sidebar when the first
        // panel gets added
        {
          const activeButtonContainer = this.#getActiveButtonContainer();

          if (isGlobal) {
            if (this.#getShouldGlobalAppSidebarOpen()) {
              const activeButtonContainerPresentAndIsForGlobal =
                this.#globalIconArea &&
                activeButtonContainer &&
                this.#globalIconArea.contains(activeButtonContainer);

              if (!activeButtonContainerPresentAndIsForGlobal) {
                activate(true);
              }
            }
          } else {
            if (this.#getShouldThreadAppSidebarOpen()) {
              const activeButtonContainerPresentAndIsForThread =
                this.#threadIconArea &&
                activeButtonContainer &&
                this.#threadIconArea.contains(activeButtonContainer);

              if (!activeButtonContainerPresentAndIsForThread) {
                activate(true);
              }
            }
          }
        }
      }
    });
  }

  #removeButton(
    event: Record<string, any>,
    buttonContainers: Map<string, HTMLElement>,
    iconArea: HTMLElement | null | undefined,
  ) {
    const appName = event.detail.appName;
    const container = buttonContainers.get(appName);

    if (!iconArea || !container) {
      throw new Error(
        'should not happen: tried to remove button without container or iconArea',
      );
    }

    const currentCount = Number(container.getAttribute('data-count'));

    if (currentCount <= 1) {
      const activeButtonContainer = iconArea.querySelector(
        '.sidebar_button_container_active',
      );

      if (container === activeButtonContainer) {
        if (!this.#closeButton) throw new Error();

        this.#closeButton(false);

        this.#companionSidebarOuterWrapper.classList.remove(
          'companion_app_sidebar_wrapper_visible',
        );

        this.#companionSidebarContentContainerEl.classList.remove(
          'companion_app_sidebar_visible',
        );

        const contentContainer =
          this.#companionSidebarOuterWrapper.previousElementSibling;
        if (contentContainer)
          contentContainer.classList.remove(
            'companion_container_app_sidebar_visible',
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

  #closeSidebarAndDeactivateButton(activeButtonContainer: HTMLElement) {
    activeButtonContainer.classList.remove('sidebar_button_container_active');

    this.#companionSidebarOuterWrapper.classList.remove(
      'companion_app_sidebar_wrapper_visible',
    );

    this.#companionSidebarContentContainerEl.classList.add(
      COMPANION_SIDEBAR_CONTENT_CLOSED_SHADOW_CLASS,
    );

    this.#companionSidebarContentContainerEl.classList.remove(
      'companion_app_sidebar_visible',
      'companion_global_app_sidebar_visible',
    );

    const contentContainer =
      this.#companionSidebarOuterWrapper.previousElementSibling;
    if (contentContainer)
      contentContainer.classList.remove(
        'companion_container_app_sidebar_visible',
      );
  }

  #openSidebarAndActivateButton(
    buttonContainer: HTMLElement,
    isGlobal: boolean,
  ) {
    const companionSidebarIconContainerEl =
      GmailElementGetter.getCompanionSidebarIconContainerElement();
    if (!companionSidebarIconContainerEl)
      throw new Error(
        'Could not find companion sidebar icon container element',
      );

    const activeButtonContainer = this.#getActiveButtonContainer();

    if (activeButtonContainer) {
      throw new Error('activeButtonContainer should not be true'); // this._closeSidebarAndDeactivateButton(activeButtonContainer);
    }

    {
      // If a gmail addon is active, close it.
      const nativeActiveAddOnIcon =
        companionSidebarIconContainerEl.querySelector<HTMLElement>(
          ACTIVE_ADD_ON_ICON_SELECTOR,
        );

      if (nativeActiveAddOnIcon) {
        simulateClick(nativeActiveAddOnIcon);
      }
    }
    buttonContainer.classList.add('sidebar_button_container_active');

    this.#companionSidebarOuterWrapper.classList.add(
      'companion_app_sidebar_wrapper_visible',
    );

    this.#companionSidebarContentContainerEl.classList.add(
      'companion_app_sidebar_visible',
    );

    this.#companionSidebarContentContainerEl.classList.remove(
      COMPANION_SIDEBAR_CONTENT_CLOSED_SHADOW_CLASS,
    );

    const contentContainer =
      this.#companionSidebarOuterWrapper.previousElementSibling;
    if (contentContainer)
      contentContainer.classList.add('companion_container_app_sidebar_visible');
    if (isGlobal)
      this.#companionSidebarContentContainerEl.classList.add(
        'companion_global_app_sidebar_visible',
      );
  }

  #setupElement() {
    const companionSidebarIconContainerEl =
      GmailElementGetter.getCompanionSidebarIconContainerElement();
    if (!companionSidebarIconContainerEl)
      throw new Error(
        'Could not find companion sidebar icon container element',
      );

    this.#companionSidebarContentContainerEl.setAttribute(
      'data-sdk-sidebar-instance-id',
      this.#instanceId,
    );

    // TODO: Once the changes to the GMail DOM have been entirely ramped, drop the ternary here and
    // always get the parentElement. (Jun 20, 2018)
    this.#companionSidebarOuterWrapper =
      this.#companionSidebarContentContainerEl.classList.contains('bq9')
        ? this.#companionSidebarContentContainerEl
        : (this.#companionSidebarContentContainerEl.parentElement as any);

    if (!this.#companionSidebarOuterWrapper) {
      throw new Error(
        'should not happen: failed to find companionSidebarOuterWrapper',
      );
    }

    // detect 2024-11-07 gmail update that moved sidebar icons to the right of
    // the sidebar
    if (this.#companionSidebarOuterWrapper.classList.contains('WN9Ejb')) {
      document.body.classList.add('inboxsdk__sidebar_icons_right');
      this.#driver.getLogger().eventSite('sidebar_icons_right');
    }

    const contentContainer =
      this.#companionSidebarOuterWrapper.previousElementSibling;

    if (contentContainer) {
      contentContainer.classList.add(
        idMap('companion_container_app_sidebar_in_use'),
      );
    }

    this.#companionSidebarContentContainerEl.classList.add(
      idMap('app_sidebar_in_use'),
    );

    if (!document.body.querySelector(sidebarWaitingPlatformSelector)) {
      const waitingPlatform = document.createElement('div');
      waitingPlatform.className = cx(
        sidebarWaitingPlatformClassName,
        idMap('app_sidebar_waiting_platform'),
      );
      document.body.appendChild(waitingPlatform);
    }

    // thread sidebar content panels
    {
      Kefir.fromEvents<StorageEvent, unknown>(window, 'storage')
        .filter((e) => e.key === 'inboxsdk__sidebar_ordering')
        .takeUntilBy(this.#stopper)
        .onValue(() => {
          this.#orderManager.reload();

          this.#renderThreadSidebarIfPresent();
        });
      Kefir.fromEvents<CustomEvent<SidebarPanelEvent>, unknown>(
        document.body,
        'inboxsdkNewSidebarPanel',
      )
        .filter(
          (e) => e.detail.sidebarId === this.#instanceId && !e.detail.isGlobal,
        )
        .takeUntilBy(this.#stopper)
        .onValue((event) => {
          this.#createThreadSidebarIfNeeded();

          let id = event.detail.id;

          while (this.#currentIds.has(id)) {
            id = incrementName(id);
          }

          this.#currentIds.add(id);

          const appName = event.detail.appName;

          this.#orderManager.addItem({
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
              iconLiga: event.detail.iconLiga,
              iconUrl: event.detail.iconUrl,
              hideTitleBar: event.detail.hideTitleBar,
              el: event.target as HTMLElement,
            },
          });

          this.#renderThreadSidebar();

          let threadIconArea = (this.#threadIconArea =
            companionSidebarIconContainerEl.querySelector<HTMLElement>(
              '.sidebar_thread_iconArea',
            ));

          if (!threadIconArea) {
            threadIconArea = this.#threadIconArea =
              document.createElement('div');
            threadIconArea.className = idMap('sidebar_iconArea');
            threadIconArea.classList.add('sidebar_thread_iconArea');
            addCompanionThreadIconArea(
              this.#driver.getLogger(),
              threadIconArea,
              companionSidebarIconContainerEl,
            );
          }

          this.#addButton(threadIconArea, event, false);
        });
      Kefir.fromEvents<CustomEvent<SidebarPanelEvent>, unknown>(
        document.body,
        'inboxsdkUpdateSidebarPanel',
      )
        .filter(
          (e) => e.detail.sidebarId === this.#instanceId && !e.detail.isGlobal,
        )
        .takeUntilBy(this.#stopper)
        .onValue((event) => {
          const orderedItems = this.#orderManager.getOrderedItems();

          const index = findIndex(
            orderedItems,
            (x) => x.value.instanceId === event.detail.instanceId,
          );
          if (index === -1)
            throw new Error('should not happen: failed to find orderItem');

          this.#orderManager.updateItemValueByIndex(index, {
            id: orderedItems[index].value.id,
            appId: event.detail.appId,
            appName: event.detail.appName || event.detail.title,
            instanceId: event.detail.instanceId,
            title: event.detail.title,
            iconClass: event.detail.iconClass,
            iconLiga: event.detail.iconLiga,
            iconUrl: event.detail.iconUrl,
            hideTitleBar: event.detail.hideTitleBar,
            el: event.target as HTMLElement,
          });

          this.#renderThreadSidebar();
        });
      Kefir.fromEvents<any, unknown>(
        document.body,
        'inboxsdkRemoveSidebarPanel',
      )
        .filter(
          (e) => e.detail.sidebarId === this.#instanceId && !e.detail.isGlobal,
        )
        .takeUntilBy(this.#stopper)
        .onValue((event) => {
          const orderedItems = this.#orderManager.getOrderedItems();

          const index = findIndex(
            orderedItems,
            (x) => x.value.instanceId === event.detail.instanceId,
          );
          if (index === -1)
            throw new Error('should not happen: failed to find orderItem');

          this.#currentIds.delete(orderedItems[index].id);

          this.#orderManager.removeItemByIndex(index);

          this.#renderThreadSidebar();

          this.#removeButton(
            event,
            this.#threadButtonContainers,
            this.#threadIconArea,
          );
        });
      Kefir.fromEvents<any, unknown>(
        document.body,
        'inboxsdkSidebarPanelScrollIntoView',
      )
        .filter(
          (e) => e.detail.sidebarId === this.#instanceId && !e.detail.isGlobal,
        )
        .takeUntilBy(this.#stopper)
        .onValue((event) => {
          if (this.#threadSidebarComponent)
            this.#threadSidebarComponent.scrollPanelIntoView(
              event.detail.instanceId,
            );
        });
      Kefir.fromEvents<any, unknown>(document.body, 'inboxsdkSidebarPanelClose')
        .filter(
          (e) => e.detail.sidebarId === this.#instanceId && !e.detail.isGlobal,
        )
        .takeUntilBy(this.#stopper)
        .onValue((event) => {
          if (this.#threadSidebarComponent)
            this.#threadSidebarComponent.closePanel(event.detail.instanceId);
        });
      Kefir.fromEvents<any, unknown>(document.body, 'inboxsdkSidebarPanelOpen')
        .filter(
          (e) => e.detail.sidebarId === this.#instanceId && !e.detail.isGlobal,
        )
        .takeUntilBy(this.#stopper)
        .onValue((e) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          this.#renderThreadSidebar().then((threadSidebarComponent) => {
            const descriptor = this.#instanceIdsToDescriptors.get(
              e.detail.instanceId,
            );

            if (!descriptor) return;

            const buttonContainer = this.#threadButtonContainers.get(
              descriptor.appName,
            );

            if (!buttonContainer) {
              throw new Error('missing button container');
            }

            const activeButtonContainer = this.#getActiveButtonContainer();

            if (activeButtonContainer !== buttonContainer) {
              querySelector(buttonContainer, 'button').click();
            }
          });
        });
    }
    // global sidebar content panels
    {
      Kefir.fromEvents<any, unknown>(document.body, 'inboxsdkNewSidebarPanel')
        .filter(
          (e) => e.detail.sidebarId === this.#instanceId && e.detail.isGlobal,
        )
        .takeUntilBy(this.#stopper)
        .onValue((event) => {
          let id = event.detail.id;

          while (this.#currentIds.has(id)) {
            id = incrementName(id);
          }

          this.#currentIds.add(id);

          const appName = event.detail.appName;
          let globalIconArea = (this.#globalIconArea =
            companionSidebarIconContainerEl.querySelector<HTMLElement>(
              '.sidebar_global_iconArea',
            ));

          if (!globalIconArea) {
            globalIconArea = this.#globalIconArea =
              document.createElement('div');
            globalIconArea.className = idMap('sidebar_iconArea');
            globalIconArea.classList.add('sidebar_global_iconArea');
            addCompanionGlobalIconArea(
              this.#driver.getLogger(),
              globalIconArea,
              companionSidebarIconContainerEl,
            );
          }

          const sdkContentContainerEl = document.createElement('div');
          sdkContentContainerEl.classList.add(
            'addon_sidebar',
            idMap('app_sidebar_container'),
            'global_app_sidebar',
          );

          this.#companionSidebarContentContainerEl.insertAdjacentElement(
            'afterbegin',
            sdkContentContainerEl,
          );

          this.#contentContainers.set(appName, sdkContentContainerEl);

          sdkContentContainerEl.appendChild(event.target);
          sdkContentContainerEl.style.display = 'none';

          this.#addButton(globalIconArea, event, true);
        });
      Kefir.fromEvents<CustomEvent<SidebarPanelEvent>, unknown>(
        document.body,
        'inboxsdkUpdateSidebarPanel',
      )
        .filter(
          (e) => e.detail.sidebarId === this.#instanceId && e.detail.isGlobal!,
        )
        .takeUntilBy(this.#stopper)
        .onValue((event) => {
          const buttonContainer = this.#globalButtonContainers.get(
            event.detail.appName,
          );

          if (!buttonContainer) return;
          const {
            iconClass = '',
            iconLiga,
            iconUrl = event.detail.appIconUrl,
          } = event.detail;
          if (!iconLiga) {
            const imgElement = querySelector(buttonContainer, 'img');
            imgElement.setAttribute('src', iconUrl!);
          }
          const button = querySelector(buttonContainer, 'button');
          button.setAttribute('class', `inboxsdk__button_icon ${iconClass}`);
        });
      Kefir.fromEvents<any, unknown>(
        document.body,
        'inboxsdkRemoveSidebarPanel',
      )
        .filter(
          (e) => e.detail.sidebarId === this.#instanceId && e.detail.isGlobal,
        )
        .takeUntilBy(this.#stopper)
        .onValue((event) => {
          this.#currentIds.delete(event.detail.id);

          this.#removeButton(
            event,
            this.#globalButtonContainers,
            this.#globalIconArea,
          );
        });
      Kefir.fromEvents<any, unknown>(document.body, 'inboxsdkSidebarPanelClose')
        .filter(
          (e) => e.detail.sidebarId === this.#instanceId && e.detail.isGlobal,
        )
        .takeUntilBy(this.#stopper)
        .onValue((event) => {
          const descriptor = this.#instanceIdsToDescriptors.get(
            event.detail.instanceId,
          );

          if (!descriptor) return;

          const buttonContainer = this.#globalButtonContainers.get(
            descriptor.appName,
          );

          if (!buttonContainer) return;

          const activeButtonContainer = this.#getActiveButtonContainer();

          if (activeButtonContainer === buttonContainer) {
            if (!this.#closeButton) {
              throw new Error('Expected this._closeButton');
            }

            this.#closeButton(true);
          }
        });
      Kefir.fromEvents<any, unknown>(document.body, 'inboxsdkSidebarPanelOpen')
        .filter(
          (e) => e.detail.sidebarId === this.#instanceId && e.detail.isGlobal,
        )
        .takeUntilBy(this.#stopper)
        .onValue((event) => {
          const descriptor = this.#instanceIdsToDescriptors.get(
            event.detail.instanceId,
          );

          if (!descriptor) return;

          const buttonContainer = this.#globalButtonContainers.get(
            descriptor.appName,
          );

          if (!buttonContainer) return;

          const activeButtonContainer = this.#getActiveButtonContainer();

          if (activeButtonContainer !== buttonContainer) {
            querySelector(buttonContainer, 'button').click();
          }
        });
    }
    // instance id to descriptor management
    {
      Kefir.fromEvents<any, unknown>(document.body, 'inboxsdkNewSidebarPanel')
        .filter((e) => e.detail.sidebarId === this.#instanceId)
        .takeUntilBy(this.#stopper)
        .onValue((event) => {
          this.#instanceIdsToDescriptors.set(
            event.detail.instanceId,
            event.detail,
          );
        });
      Kefir.fromEvents<any, unknown>(
        document.body,
        'inboxsdkRemoveSidebarPanel',
      )
        .filter((e) => e.detail.sidebarId === this.#instanceId)
        .takeUntilBy(this.#stopper)
        .onValue((event) => {
          this.#instanceIdsToDescriptors.delete(event.detail.instanceId);
        });
      Kefir.fromEvents<CustomEvent<SidebarPanelEvent>, unknown>(
        document.body,
        'inboxsdkUpdateSidebarPanel',
      )
        .filter((e) => e.detail.sidebarId === this.#instanceId)
        .takeUntilBy(this.#stopper)
        .onValue((event) => {
          this.#instanceIdsToDescriptors.set(
            event.detail.instanceId,
            event.detail,
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
    const globalAddOnContentContainer = this.#companionSidebarContentContainerEl
      .children[0] as HTMLElement;
    const threadAddOnContentContainer = this.#companionSidebarContentContainerEl
      .children[1] as HTMLElement;
    Kefir.merge(
      [globalAddOnContentContainer, threadAddOnContentContainer].map(
        (addonContentEl) =>
          makeMutationObserverChunkedStream(addonContentEl, {
            attributes: true,
            attributeFilter: ['style'],
          }),
      ),
    )
      .filter(
        () =>
          globalAddOnContentContainer.style.display !==
          threadAddOnContentContainer.style.display,
      )
      .takeUntilBy(this.#stopper)
      .onValue(() => {
        // TODO What is this block for? It closes the current section whenever
        // one of the Gmail addons bar elements changes?
        const activeButtonContainer = this.#getActiveButtonContainer();

        if (activeButtonContainer) {
          querySelector(activeButtonContainer, 'button').click();
        }
      });
  }
}

export default GmailAppSidebarPrimary;
