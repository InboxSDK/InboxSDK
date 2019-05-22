/* @flow */

import constant from 'lodash/constant';
import asap from 'asap';
import delay from 'pdelay';
import { defn } from 'ud';
import util from 'util';
import Kefir from 'kefir';
import { parse } from 'querystring';
import kefirBus from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import type { Bus } from 'kefir-bus';

import findParent from '../../../../common/find-parent';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
import querySelector from '../../../lib/dom/querySelectorOrFail';
import idMap from '../../../lib/idMap';
import SimpleElementView from '../../../views/SimpleElementView';
import CustomMessageView from '../../../views/conversations/custom-message-view';

import delayAsap from '../../../lib/delay-asap';
import type GmailDriver from '../gmail-driver';
import GmailElementGetter from '../gmail-element-getter';
import GmailMessageView from './gmail-message-view';
import GmailToolbarView from './gmail-toolbar-view';
import type GmailAppSidebarView from './gmail-app-sidebar-view';
import GmailThreadSidebarView from './gmail-thread-sidebar-view';
import WidthManager from './gmail-thread-view/width-manager';

import type { CustomMessageDescriptor } from '../../../views/conversations/custom-message-view';

let hasLoggedAddonInfo = false;
const MIN_CONSECUTIVE_HIDDEN = 2;

class GmailThreadView {
  _element: HTMLElement;
  _routeViewDriver: any;
  _driver: GmailDriver;
  _isPreviewedThread: boolean;
  _eventStream: Bus<any> = kefirBus();
  _stopper = kefirStopper();
  _threadSidebar: ?GmailThreadSidebarView = null;
  _widthManager: ?WidthManager = null;

  _toolbarView: any;
  _messageViewDrivers: any[] = [];
  _newMessageMutationObserver: ?MutationObserver;
  _readyStream: Kefir.Observable<any>;
  _threadID: ?string;
  _syncThreadID: ?string;
  _hiddenCustomMessageNoticeProvider: ?(
    numberCustomMessagesHidden: number,
    numberNativeMessagesHidden: ?number,
    unmountPromise: Promise<void>
  ) => ?HTMLElement;
  _customMessageViews: Array<CustomMessageView> = [];

  constructor(
    element: HTMLElement,
    routeViewDriver: any,
    driver: GmailDriver,
    isPreviewedThread: boolean = false
  ) {
    this._element = element;
    this._routeViewDriver = routeViewDriver;
    this._driver = driver;
    this._isPreviewedThread = isPreviewedThread;

    this._logAddonElementInfo().catch(err =>
      this._driver.getLogger().error(err)
    );

    const waitForSidebarReady = (this._driver.isUsingMaterialUI()
      ? this._driver.waitForGlobalSidebarReady()
      : Kefir.constant(null)
    )
      .merge(
        this._driver
          .delayToTimeAfterReady(15 * 1000)
          .flatMap(() =>
            Kefir.constantError(
              new Error('15 second timeout while waiting for sidebar fired')
            )
          )
      )
      .take(1)
      .takeErrors(1)
      .flatMapErrors(err => {
        this._driver.getLogger().error(err);
        return Kefir.constant(null);
      })
      .toProperty();

    let combinedReadyStream;
    if (
      driver.getOpts().REQUESTED_API_VERSION === 1 &&
      driver.isUsingSyncAPI()
    ) {
      combinedReadyStream = Kefir.combine([
        waitForSidebarReady,
        Kefir.fromPromise(this.getThreadIDAsync())
      ]);
    } else {
      combinedReadyStream = waitForSidebarReady;
    }
    this._readyStream = combinedReadyStream
      .map(() => {
        this._setupToolbarView();
        this._setupMessageViewStream();
        return null;
      })
      .takeUntilBy(this._stopper)
      .toProperty();

    this._listenToExpandCollapseAll();
  }

  // TODO use livesets eventually
  getMessageViewDriverStream(): Kefir.Observable<GmailMessageView> {
    return Kefir.constant(this._messageViewDrivers)
      .flatten()
      .merge(
        this._eventStream
          .filter(
            event =>
              event.type === 'internal' && event.eventName === 'messageCreated'
          )
          .map(event => event.view)
      );
  }

  isLoadingStub() {
    return false;
  }
  getStopper() {
    return this._stopper;
  }
  getEventStream(): Kefir.Observable<Object> {
    return this._eventStream;
  }
  getElement(): HTMLElement {
    return this._element;
  }
  getRouteViewDriver(): any {
    return this._routeViewDriver;
  }
  getIsPreviewedThread(): boolean {
    return this._isPreviewedThread;
  }
  getToolbarView(): any {
    return this._toolbarView;
  }
  getMessageViewDrivers(): GmailMessageView[] {
    return this._messageViewDrivers;
  }

  destroy() {
    this._eventStream.end();
    this._stopper.destroy();
    if (this._toolbarView) this._toolbarView.destroy();
    if (this._threadSidebar) this._threadSidebar.destroy();

    this._messageViewDrivers.forEach(messageView => {
      messageView.destroy();
    });
    this._messageViewDrivers.length = 0;
    if (this._newMessageMutationObserver) {
      this._newMessageMutationObserver.disconnect();
    }

    this._customMessageViews.forEach(customMessageView =>
      customMessageView.destroy()
    );
  }

  addSidebarContentPanel(descriptor: Kefir.Observable<Object>) {
    if (this._driver.isUsingMaterialUI()) {
      const sidebar = this._driver.getGlobalSidebar();
      return sidebar.addThreadSidebarContentPanel(descriptor, this);
    } else {
      const sidebarElement = GmailElementGetter.getSidebarContainerElement();
      const addonSidebarElement = GmailElementGetter.getAddonSidebarContainerElement();
      const companionSidebarContentContainerElement = GmailElementGetter.getCompanionSidebarContentContainerElement();
      if (!sidebarElement && !addonSidebarElement) {
        console.warn('This view does not have a sidebar'); //eslint-disable-line no-console
        return;
      }
      let sidebar = this._threadSidebar;
      if (!sidebar) {
        let widthManager;
        if (addonSidebarElement) {
          widthManager = this._setupWidthManager();
        }
        sidebar = this._threadSidebar = new GmailThreadSidebarView(
          this._driver,
          sidebarElement,
          addonSidebarElement,
          widthManager
        );
        sidebar.getStopper().onValue(() => {
          if (this._threadSidebar === sidebar) {
            this._threadSidebar = null;
          }
        });
      }
      return sidebar.addSidebarContentPanel(descriptor);
    }
  }

  addNoticeBar(): SimpleElementView {
    const el = document.createElement('div');
    el.className = idMap('thread_noticeBar');
    const subjectContainer = this._element.querySelector('.if > .nH');
    if (!subjectContainer) throw new Error('Failed to find subject container');
    subjectContainer.insertAdjacentElement('afterend', el);
    const view = new SimpleElementView(el);

    this._stopper
      .takeUntilBy(Kefir.fromEvents(view, 'destroy'))
      .onValue(() => view.destroy());

    return view;
  }

  registerHiddenCustomMessageNoticeProvider(
    provider: (
      numberCustomMessagesHidden: number,
      numberNativeMessagesHidden: ?number,
      unmountPromise: Promise<void>
    ) => HTMLElement
  ) {
    this._hiddenCustomMessageNoticeProvider = provider;
  }

  addCustomMessage(
    descriptorStream: Kefir.Observable<CustomMessageDescriptor>
  ): CustomMessageView {
    const customMessageView = new CustomMessageView(
      descriptorStream,
      this._hiddenCustomMessageNoticeProvider,
      newCustomMessageView => {
        this._customMessageViews.push(newCustomMessageView);
        this._readyStream.onValue(
          async (): any => {
            const parentElement = this._element.parentElement;
            if (!parentElement) {
              throw new Error('Parent must be defined.');
            }
            const messageContainer = this._element.querySelector('[role=list]');
            if (!messageContainer) return;

            const nativeMessages = await Promise.all(
              this._messageViewDrivers.map(async messageView => ({
                sortDatetime: (await messageView.getDate()) || 0,
                getViewState: () => messageView.getViewState(),
                isNativeMessage: true,
                element: messageView.getElement()
              }))
            );

            const customMessageElements = Array.from(
              parentElement.querySelectorAll('.inboxsdk__custom_message_view')
            );

            const customMessages = customMessageElements
              .filter(
                customMessageElement =>
                  customMessageElement !== newCustomMessageView.getElement()
              )
              .map(this._messageDescriptorFromCustomMessage);

            const messages = [...nativeMessages, ...customMessages].sort(
              (a, b) => a.sortDatetime - b.sortDatetime
            );

            const messageDate = customMessageView.getSortDate();
            if (!messageDate) return;

            const insertBeforeIndex = messages.findIndex(
              message => message.sortDatetime >= messageDate.getTime()
            );

            if (insertBeforeIndex >= 0) {
              messages[insertBeforeIndex].element.insertAdjacentElement(
                'beforebegin',
                customMessageView.getElement()
              );
            } else {
              messageContainer.insertAdjacentElement(
                'beforeend',
                customMessageView.getElement()
              );
            }

            messages.splice(
              insertBeforeIndex > 0 ? insertBeforeIndex : messages.length,
              0,
              this._messageDescriptorFromCustomMessage(
                newCustomMessageView.getElement()
              )
            );

            // Go through and toggle view states as needed.
            // The first or last message, if custom, is always collapsed (which it is by default),
            // so start at the second message and end at the second to last.
            for (let i = 1; i < messages.length - 1; i++) {
              const currentMessage = messages[i];

              if (currentMessage.isNativeMessage) {
                continue;
              }

              // If next to something hidden
              if (
                messages[i - 1].getViewState() === 'HIDDEN' ||
                messages[i + 1].getViewState() === 'HIDDEN'
              ) {
                currentMessage.setViewState('HIDDEN');
              }

              // Or the first of MIN_CONSECUTIVE_HIDDEN applicable custom messages
              const candidates = messages.slice(
                i,
                Math.min(i + MIN_CONSECUTIVE_HIDDEN, messages.length - 1)
              );
              if (
                candidates.every(candidate => !candidate.isNativeMessage) &&
                candidates.length >= MIN_CONSECUTIVE_HIDDEN
              ) {
                currentMessage.setViewState('HIDDEN');
              }
            }

            parentElement.classList.add(
              'inboxsdk__thread_view_with_custom_view'
            );
          }
        );
      }
    );

    customMessageView.on('destroy', () => {
      const parentElement = this._element.parentElement;
      if (!parentElement) {
        throw new Error('Parent must be defined.');
      }

      const remainingCustomMessageViews = Array.from(
        parentElement.querySelectorAll('.inboxsdk__custom_message_view')
      );

      if (remainingCustomMessageViews.length === 0) {
        parentElement.classList.remove(
          'inboxsdk__thread_view_with_custom_view'
        );
      }
    });

    return customMessageView;
  }

  _messageDescriptorFromCustomMessage(customMessageElement: HTMLElement) {
    return {
      sortDatetime:
        parseInt(customMessageElement.getAttribute('data-inboxsdk-sortdate')) ||
        0,
      getViewState: () => {
        if (
          customMessageElement.classList.contains(
            'inboxsdk__custom_message_view_hidden'
          )
        ) {
          return 'HIDDEN';
        } else if (
          customMessageElement.classList.contains(
            'inboxsdk__custom_message_view_collapsed'
          )
        ) {
          return 'COLLAPSED';
        }
        return 'EXPANDED';
      },
      setViewState: newViewState => {
        customMessageElement.dispatchEvent(
          new CustomEvent('inboxsdk-setViewState', {
            bubbles: false,
            cancelable: false,
            detail: {
              newViewState
            }
          })
        );
      },
      isNativeMessage: false,
      element: customMessageElement
    };
  }

  getSubject(): string {
    var subjectElement = this._element.querySelector('.ha h2');
    if (!subjectElement) {
      return '';
    } else {
      return subjectElement.textContent;
    }
  }

  getInternalID(): string {
    return this._syncThreadID || this.getThreadID();
  }

  getThreadID(): string {
    if (this._threadID) return this._threadID;

    let threadID;
    if (this._isPreviewedThread) {
      threadID = this._driver
        .getPageCommunicator()
        .getCurrentThreadID(this._element, true);
    } else {
      const params = this._routeViewDriver
        ? this._routeViewDriver.getParams()
        : null;

      if (params && params.threadID) {
        threadID = params.threadID;
      } else {
        const err = new Error('Failed to get id for thread');
        this._driver.getLogger().error(err);
        throw err;
      }
    }

    this._threadID = threadID;
    return threadID;
  }

  async getThreadIDAsync(): Promise<string> {
    let threadID;
    if (this._driver.isUsingSyncAPI()) {
      const idElement = this._element.querySelector('[data-thread-perm-id]');
      if (!idElement) throw new Error('threadID element not found');

      const syncThreadID = (this._syncThreadID = idElement.getAttribute(
        'data-thread-perm-id'
      ));
      if (!syncThreadID)
        throw new Error('syncThreadID attribute with no value');

      this._threadID = threadID = idElement.getAttribute(
        'data-legacy-thread-id'
      );
      if (!threadID) {
        this._threadID = threadID = await this._driver.getOldGmailThreadIdFromSyncThreadId(
          syncThreadID
        );
      }
    } else {
      if (this._isPreviewedThread) {
        threadID = this._driver
          .getPageCommunicator()
          .getCurrentThreadID(this._element, true);
      } else {
        const params = this._routeViewDriver
          ? this._routeViewDriver.getParams()
          : null;

        if (params && params.threadID) {
          threadID = params.threadID;
        } else {
          const err = new Error('Failed to get id for thread');
          this._driver.getLogger().error(err);
          throw err;
        }
      }

      this._threadID = threadID;
    }

    if (this._threadID) return this._threadID;
    else throw new Error('Failed to get id for thread');
  }

  _setupToolbarView() {
    const toolbarElement = this._findToolbarElement();
    if (!toolbarElement) throw new Error('No toolbar element found');
    const toolbarParent = toolbarElement.parentElement;
    if (toolbarParent)
      toolbarParent.classList.add('inboxsdk__thread_toolbar_parent');

    this._toolbarView = new GmailToolbarView(
      toolbarElement,
      this._driver,
      this._routeViewDriver,
      this
    );
  }

  _findToolbarElement(): ?HTMLElement {
    var toolbarContainerElements = document.querySelectorAll('[gh=tm]');
    for (var ii = 0; ii < toolbarContainerElements.length; ii++) {
      if (this._isToolbarContainerRelevant(toolbarContainerElements[ii])) {
        return toolbarContainerElements[ii].querySelector('[gh=mtb]');
      }
    }

    return null;
  }

  _isToolbarContainerRelevant(toolbarContainerElement: HTMLElement): boolean {
    if (
      (toolbarContainerElement: any).parentElement.parentElement ===
      (this._element: any).parentElement.parentElement
    ) {
      return true;
    }

    if (
      (toolbarContainerElement: any).parentElement.getAttribute('role') !==
        'main' &&
      (this._element: any).parentElement.getAttribute('role') !== 'main'
    ) {
      return true;
    }

    if (
      (toolbarContainerElement: any).parentElement.getAttribute('role') ===
        'main' &&
      (toolbarContainerElement: any).parentElement.querySelector('.if') &&
      (toolbarContainerElement: any).parentElement.querySelector('.if')
        .parentElement === this._element
    ) {
      return true;
    }

    return false;
  }

  _setupMessageViewStream() {
    var openMessage = this._element.querySelector('.h7');

    if (!openMessage) {
      var self = this;
      setTimeout(function() {
        if (self._element) {
          self._setupMessageViewStream();
        }
      }, 500);
      return;
    }

    var messageContainer: HTMLElement = (openMessage.parentElement: any);

    this._initializeExistingMessages(messageContainer);
    this._observeNewMessages(messageContainer);
  }

  _initializeExistingMessages(messageContainer: any) {
    var self = this;
    var children = messageContainer.children;
    Array.prototype.forEach.call(children, function(childElement) {
      self._createMessageView(childElement);
    });
  }

  _observeNewMessages(messageContainer: any) {
    this._newMessageMutationObserver = (new MutationObserver(
      this._handleNewMessageMutations.bind(this)
    ): any);
    this._newMessageMutationObserver.observe(messageContainer, {
      childList: true
    });
  }

  _handleNewMessageMutations(mutations: MutationRecord[]) {
    var self = this;
    mutations.forEach(function(mutation) {
      Array.prototype.forEach.call(mutation.addedNodes, function(addedNode) {
        if (!addedNode.classList.contains('inboxsdk__custom_message_view'))
          self._createMessageView(addedNode);
      });
    });
  }

  _createMessageView(messageElement: HTMLElement) {
    var messageView = new GmailMessageView(messageElement, this, this._driver);

    this._eventStream.plug(messageView.getEventStream());

    this._messageViewDrivers.push(messageView);
    this._eventStream.emit({
      type: 'internal',
      eventName: 'messageCreated',
      view: messageView
    });
  }

  _setupWidthManager() {
    let widthManager = this._widthManager;
    if (!widthManager) {
      const addonSidebarElement = GmailElementGetter.getAddonSidebarContainerElement();
      if (!addonSidebarElement)
        throw new Error('addonSidebarElement not found');

      const mainContentBodyContainerElement = GmailElementGetter.getMainContentBodyContainerElement();
      if (!mainContentBodyContainerElement)
        throw new Error('mainContentBodyContainerElement not found');
      const contentContainer = mainContentBodyContainerElement.parentElement;
      if (!contentContainer)
        throw new Error(
          'mainContentBodyContainerElement has no parent element'
        );

      this._widthManager = widthManager = new WidthManager(
        (contentContainer: any),
        addonSidebarElement
      );
    }

    return widthManager;
  }

  getReadyStream() {
    return this._readyStream;
  }

  async _logAddonElementInfo() {
    if (hasLoggedAddonInfo) return;

    function readInfo() {
      const container = GmailElementGetter.getAddonSidebarContainerElement();
      if (!container) return null;

      const isDisplayNone = {
        parent: container.parentElement
          ? (container.parentElement: any).style.display === 'none'
          : null,
        self: container.style.display === 'none',
        children: Array.from(container.children).map(el =>
          el.style ? el.style.display === 'none' : null
        )
      };

      const rect = container.getBoundingClientRect();
      const size = {
        width: rect.width,
        height: rect.height
      };
      return { isDisplayNone, size };
    }

    const eventData = { time: {} };
    eventData.time[0] = readInfo();

    await Promise.all(
      [30, 5000].map(async time => {
        await delay(time);
        if (this._stopper.stopped) return;
        eventData.time[time] = readInfo();
      })
    );
    if (this._stopper.stopped) return;

    this._driver
      .getLogger()
      .eventSdkPassive('gmailSidebarElementInfo', eventData);

    hasLoggedAddonInfo = true;
  }

  _listenToExpandCollapseAll() {
    //expand all
    const expandAllElementImg = this._element.querySelector('img.gx');
    if (expandAllElementImg) {
      const expandAllElement = findParent(
        expandAllElementImg,
        el => el.getAttribute('role') === 'button'
      );

      if (expandAllElement) {
        Kefir.merge([
          Kefir.fromEvents(expandAllElement, 'click'),
          Kefir.fromEvents(expandAllElement, 'keydown').filter(
            e => e.which === 13 /* enter */
          )
        ])
          .takeUntilBy(this._stopper)
          .onValue(() => {
            this._customMessageViews.forEach(customMessageView =>
              customMessageView.setViewState('EXPANDED')
            );
          });
      }
    }

    //collapse all
    const collapseAllElementImg = this._element.querySelector('img.gq');
    if (collapseAllElementImg) {
      const collapseAllElement = findParent(
        collapseAllElementImg,
        el => el.getAttribute('role') === 'button'
      );
      if (collapseAllElement) {
        Kefir.merge([
          Kefir.fromEvents(collapseAllElement, 'click'),
          Kefir.fromEvents(collapseAllElement, 'keydown').filter(
            e => e.which === 13 /* enter */
          )
        ])
          .takeUntilBy(this._stopper)
          .onValue(() => {
            this._customMessageViews.forEach(customMessageView =>
              customMessageView.setViewState('COLLAPSED')
            );
          });
      }
    }
  }
}

export default defn(module, GmailThreadView);
