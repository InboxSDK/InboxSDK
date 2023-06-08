/* eslint-disable @typescript-eslint/no-unused-vars */
import constant from 'lodash/constant';
import asap from 'asap';
import delay from 'pdelay';
import util from 'util';
import * as Kefir from 'kefir';
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

class GmailThreadView {
  _element: HTMLElement;
  _routeViewDriver: any;
  _driver: GmailDriver;
  _isPreviewedThread: boolean;
  _eventStream: Bus<any, unknown>;
  _stopper = kefirStopper();
  _threadSidebar: GmailThreadSidebarView | null | undefined = null;
  _widthManager: WidthManager | null | undefined = null;
  _toolbarView: any;
  _messageViewDrivers: any[];
  _newMessageMutationObserver: MutationObserver | null | undefined;
  _readyStream: Kefir.Observable<any, unknown>;
  _threadID: string | null | undefined;
  _syncThreadID: string | null | undefined;
  _customMessageViews: Set<CustomMessageView> = new Set();
  _hiddenCustomMessageViews: Set<CustomMessageView> = new Set();
  _hiddenCustomMessageNoticeProvider:
    | ((
        numberCustomMessagesHidden: number,
        numberNativeMessagesHidden: number | null | undefined,
        unmountPromise: Promise<void>
      ) => HTMLElement | null | undefined)
    | null
    | undefined;
  _hiddenCustomMessageNoticeElement: HTMLElement | null | undefined;
  _resolveUnmountHiddenNoticePromise: (() => void) | null | undefined;

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
    this._eventStream = kefirBus();
    this._messageViewDrivers = [];

    this._logAddonElementInfo().catch((err) =>
      this._driver.getLogger().error(err)
    );

    const waitForSidebarReady = this._driver
      .waitForGlobalSidebarReady()
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
      .flatMapErrors((err) => {
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
        Kefir.fromPromise(this.getThreadIDAsync()),
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

    this._stopper.take(1).onValue(() => {
      if (this._resolveUnmountHiddenNoticePromise) {
        this._resolveUnmountHiddenNoticePromise();
      }
    });
  }

  // TODO use livesets eventually
  getMessageViewDriverStream(): Kefir.Observable<GmailMessageView, unknown> {
    return Kefir.constant(this._messageViewDrivers)
      .flatten()
      .merge(
        this._eventStream
          .filter(
            (event) =>
              event.type === 'internal' && event.eventName === 'messageCreated'
          )
          .map((event) => event.view)
      ) as any;
  }

  isLoadingStub() {
    return false;
  }

  getStopper() {
    return this._stopper;
  }

  getEventStream(): Kefir.Observable<Record<string, any>, unknown> {
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

    this._messageViewDrivers.forEach((messageView) => {
      messageView.destroy();
    });

    this._messageViewDrivers.length = 0;

    if (this._newMessageMutationObserver) {
      this._newMessageMutationObserver.disconnect();
    }

    for (const customMessageView of this._customMessageViews) {
      customMessageView.destroy();
    }
  }

  addSidebarContentPanel(
    descriptor: Kefir.Observable<Record<string, any>, unknown>
  ) {
    const sidebar = this._driver.getGlobalSidebar();

    return sidebar.addThreadSidebarContentPanel(descriptor, this);
  }

  _subjectContainerSelectors = {
    '2022_10_21': '.a98.iY > .nH',
    '2022_10_12': '.PeIF1d > .nH',
    [2018]: '.if > .nH',
  };

  addNoticeBar(): SimpleElementView {
    const el = document.createElement('div');
    el.className = idMap('thread_noticeBar');
    let version;
    let subjectContainer;

    for (const [currentVersion, selector] of Object.entries(
      this._subjectContainerSelectors
    )) {
      // Flow should be able to infer selector to be a string,
      // Typescript can. Remove this when ported.
      const el = this._element.querySelector(selector as any);

      if (!el) {
        continue;
      }

      version = currentVersion;
      subjectContainer = el;
      break;
    }

    if (!subjectContainer) throw new Error('Failed to find subject container');

    this._driver.getLogger().eventSdkPassive('addNoticeBar subjectContainer', {
      version,
    });

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
      numberNativeMessagesHidden: number | null | undefined,
      unmountPromise: Promise<void>
    ) => HTMLElement
  ) {
    this._hiddenCustomMessageNoticeProvider = provider;
  }

  addCustomMessage(
    descriptorStream: Kefir.Observable<CustomMessageDescriptor, unknown>
  ): CustomMessageView {
    const parentElement = this._element.parentElement;
    if (!parentElement) throw new Error('missing parent element');
    const customMessageView = new CustomMessageView(descriptorStream, () => {
      this._readyStream.onValue(async () => {
        const messageContainer = this._element.querySelector('[role=list]');

        if (!messageContainer) return;
        let mostRecentDate = Number.MIN_SAFE_INTEGER;
        let insertBeforeMessage;
        let isInHidden = false;
        const messages = [
          ...(await Promise.all(
            this._messageViewDrivers.map(async (messageView) => ({
              sortDatetime: (await messageView.getDate()) || 0,
              isHidden: messageView.getViewState() === 'HIDDEN',
              element: messageView.getElement(),
            }))
          )),
          ...Array.from(this._customMessageViews)
            .filter(
              (cmv) =>
                cmv !== customMessageView && cmv.getElement().parentElement
              /* it has been inserted into dom */
            )
            .map((cmv) => {
              const date = cmv.getSortDate();
              const datetime = date ? date.getTime() : null;
              return {
                sortDatetime: datetime || 0,
                isHidden: cmv
                  .getElement()
                  .classList.contains('inboxsdk__custom_message_view_hidden'),
                element: cmv.getElement(),
              };
            }),
        ].sort((a, b) => a.sortDatetime - b.sortDatetime);
        const messageDate = customMessageView.getSortDate();
        if (!messageDate) return;

        for (const message of messages) {
          isInHidden = message.isHidden;

          if (
            messageDate.getTime() >= mostRecentDate &&
            messageDate.getTime() <= message.sortDatetime
          ) {
            insertBeforeMessage = message.element;
            break;
          }

          mostRecentDate = message.sortDatetime;
        }

        if (insertBeforeMessage)
          insertBeforeMessage.insertAdjacentElement(
            'beforebegin',
            customMessageView.getElement()
          );
        else
          messageContainer.insertAdjacentElement(
            'beforeend',
            customMessageView.getElement()
          );

        if (isInHidden) {
          this._setupHiddenCustomMessage(customMessageView);
        }

        parentElement.classList.add('inboxsdk__thread_view_with_custom_view');
      });
    });

    this._customMessageViews.add(customMessageView);

    customMessageView.on('destroy', () => {
      this._customMessageViews.delete(customMessageView);

      if (this._customMessageViews.size > 0)
        parentElement.classList.add('inboxsdk__thread_view_with_custom_view');
      else
        parentElement.classList.remove(
          'inboxsdk__thread_view_with_custom_view'
        );
    });
    return customMessageView;
  }

  _setupHiddenCustomMessage(customMessageView: CustomMessageView) {
    this._hiddenCustomMessageViews.add(customMessageView);

    // hide the element
    customMessageView
      .getElement()
      .classList.add('inboxsdk__custom_message_view_hidden');

    // get the message element that contains the hidden messages notice
    let hiddenNoticeMessageElement =
      this._element.querySelector<HTMLElement>('.adv');

    let nativeHiddenNoticePresent = true;

    if (!hiddenNoticeMessageElement) {
      nativeHiddenNoticePresent = false;
      const superCollapsedMessageElements = Array.from(
        this._element.querySelectorAll<HTMLElement>('.kQ')
      );
      if (superCollapsedMessageElements.length < 2) return;
      hiddenNoticeMessageElement = superCollapsedMessageElements[1];
    }

    // listen for a class change on that message which occurs when it becomes visible
    makeMutationObserverChunkedStream(hiddenNoticeMessageElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
      .takeUntilBy(
        Kefir.merge([
          this._stopper,
          Kefir.fromEvents(customMessageView, 'destroy'),
        ])
      )
      .filter(
        () =>
          (hiddenNoticeMessageElement &&
            !hiddenNoticeMessageElement.classList.contains('kQ')) as boolean
      ) //when kQ is gone, message is visible
      .onValue(() => {
        customMessageView
          .getElement()
          .classList.remove('inboxsdk__custom_message_view_hidden');
        if (this._hiddenCustomMessageNoticeElement)
          this._hiddenCustomMessageNoticeElement.remove();
        this._hiddenCustomMessageNoticeElement = null;
      });

    this._updateHiddenNotice(
      hiddenNoticeMessageElement,
      nativeHiddenNoticePresent
    );

    Kefir.fromEvents(customMessageView, 'destroy')
      .takeUntilBy(this._stopper)
      .take(1)
      .onValue(() => {
        this._hiddenCustomMessageViews.delete(customMessageView);

        if (hiddenNoticeMessageElement)
          this._updateHiddenNotice(
            hiddenNoticeMessageElement,
            nativeHiddenNoticePresent
          );
      });
  }

  _updateHiddenNotice(
    hiddenNoticeMessageElement: HTMLElement,
    nativeHiddenNoticePresent: boolean
  ) {
    const existingAppNoticeElement = this._hiddenCustomMessageNoticeElement;

    if (existingAppNoticeElement) {
      existingAppNoticeElement.remove();
      this._hiddenCustomMessageNoticeElement = null;
      if (this._resolveUnmountHiddenNoticePromise)
        this._resolveUnmountHiddenNoticePromise();
    }

    const noticeProvider = this._hiddenCustomMessageNoticeProvider;
    if (!noticeProvider) return;
    const appNoticeContainerElement = (this._hiddenCustomMessageNoticeElement =
      document.createElement('span'));
    appNoticeContainerElement.classList.add(
      'inboxsdk__custom_message_view_app_notice_content'
    );
    const numberCustomHiddenMessages = this._hiddenCustomMessageViews.size;
    let numberNativeHiddenMessages = null;

    if (nativeHiddenNoticePresent) {
      const nativeHiddenNoticeCountSpan = querySelector(
        hiddenNoticeMessageElement,
        '.adx span'
      );
      numberNativeHiddenMessages = Number(
        nativeHiddenNoticeCountSpan.innerHTML
      );

      if (isNaN(numberNativeHiddenMessages)) {
        throw new Error(
          "Couldn't find number of native hidden messages in dom structure"
        );
      }
    }

    const appNoticeElement = noticeProvider(
      numberCustomHiddenMessages,
      numberNativeHiddenMessages,
      new Promise((resolve) => {
        this._resolveUnmountHiddenNoticePromise = resolve;
      })
    );

    if (!appNoticeElement) {
      return;
    }

    appNoticeContainerElement.appendChild(appNoticeElement);

    if (!nativeHiddenNoticePresent) {
      const fakeAppNoticeElement = document.createElement('span');
      fakeAppNoticeElement.classList.add('adx');
      const insertionPoint = querySelector(hiddenNoticeMessageElement, '.G3');
      insertionPoint.appendChild(fakeAppNoticeElement);
    }

    const hiddenNoticeElement = querySelector(
      hiddenNoticeMessageElement,
      '.adx'
    );
    hiddenNoticeElement.classList.add(
      'inboxsdk__custom_message_view_app_notice_container'
    );
    hiddenNoticeElement.appendChild(appNoticeContainerElement);
  }

  getSubject(): string {
    var subjectElement = this._element.querySelector('.ha h2');

    if (!subjectElement) {
      return '';
    }

    if (subjectElement.querySelector('img[data-emoji]')) {
      return Array.from(subjectElement.childNodes)
        .map((c) => {
          if (c instanceof HTMLElement && c.nodeName === 'IMG') {
            const maybeEmoji = c.getAttribute('data-emoji');
            return maybeEmoji;
          }

          if (c.nodeName === '#text') {
            return (c as any).wholeText;
          }
        })
        .filter((x) => x != null)
        .join('');
    }

    return subjectElement.textContent!;
  }

  getInternalID(): string {
    return this._syncThreadID || this.getThreadID();
  }

  // Follows a similar structure to getThreadIDAsync, but gives up if async work is needed
  getThreadID(): string {
    if (this._threadID) return this._threadID;
    let threadID;

    if (this._driver.isUsingSyncAPI()) {
      const idElement = this._element.querySelector('[data-thread-perm-id]');

      if (!idElement) throw new Error('threadID element not found');
      const syncThreadID = (this._syncThreadID = idElement.getAttribute(
        'data-thread-perm-id'
      ));
      if (!syncThreadID)
        throw new Error('syncThreadID attribute with no value');
      threadID = idElement.getAttribute('data-legacy-thread-id');

      if (!threadID) {
        const err = new Error(
          'Failed to get id for thread: data-legacy-thread-id attribute missing'
        );

        this._driver.getLogger().error(err); // throw err;
        // Fall back to old behavior instead of throwing. Probably not super sensible, but
        // this is a deprecated method and preserving the current behavior is
        // probably an okay choice.
      }
    }

    if (!threadID) {
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
        this._threadID = threadID =
          await this._driver.getOldGmailThreadIdFromSyncThreadId(syncThreadID);
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

  addLabel(): SimpleElementView {
    const labelContainer = this._element.querySelector('.ha .J-J5-Ji');

    if (!labelContainer) {
      throw new Error('Thread view label container not found');
    }

    const el = document.createElement('span');
    labelContainer.appendChild(el);
    const view = new SimpleElementView(el);
    const observer = new MutationObserver((mutationsList) => {
      if (
        mutationsList.some(
          (mutation) =>
            mutation.type === 'childList' &&
            mutation.removedNodes &&
            mutation.removedNodes.length &&
            mutation.removedNodes.length > 0
        )
      ) {
        if (!labelContainer.contains(el)) {
          labelContainer.appendChild(el);
        }
      }
    });
    observer.observe(labelContainer, {
      childList: true,
    });

    this._stopper
      .takeUntilBy(Kefir.fromEvents(view, 'destroy'))
      .onValue(() => view.destroy());

    Kefir.fromEvents(view, 'destroy')
      .take(1)
      .onValue(() => {
        observer.disconnect();
      });
    return view;
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

  _findToolbarElement(): HTMLElement | null | undefined {
    var toolbarContainerElements =
      document.querySelectorAll<HTMLElement>('[gh=tm]');

    for (var ii = 0; ii < toolbarContainerElements.length; ii++) {
      if (this._isToolbarContainerRelevant(toolbarContainerElements[ii])) {
        return toolbarContainerElements[ii].querySelector<HTMLElement>(
          '[gh=mtb]'
        );
      }
    }

    return null;
  }

  _isToolbarContainerRelevant(toolbarContainerElement: HTMLElement): boolean {
    if (
      (toolbarContainerElement as any).parentElement.parentElement ===
      (this._element as any).parentElement.parentElement
    ) {
      return true;
    }

    if (
      (toolbarContainerElement as any).parentElement.getAttribute('role') !==
        'main' &&
      (this._element as any).parentElement.getAttribute('role') !== 'main'
    ) {
      return true;
    }

    if (
      (toolbarContainerElement as any).parentElement.getAttribute('role') ===
        'main' &&
      (toolbarContainerElement as any).parentElement.querySelector(
        '.if, .PeIF1d, .a98.iY'
      ) &&
      (toolbarContainerElement as any).parentElement.querySelector(
        '.if, .PeIF1d, .a98.iY'
      ).parentElement === this._element
    ) {
      let version = '2018';

      if (
        (toolbarContainerElement as any).parentElement.querySelector('.a98.iY')
      ) {
        version = '2022-10-20';
      } else if (
        (toolbarContainerElement as any).parentElement.querySelector('.PeIF1d')
      ) {
        version = '2022-10-12';
      }

      this._driver
        .getLogger()
        .eventSdkPassive('gmailThreadView_isToolbarContainerRelevant', {
          version,
        });

      return true;
    }

    return false;
  }

  _setupMessageViewStream() {
    var openMessage = this._element.querySelector('.h7');

    if (!openMessage) {
      var self = this;
      setTimeout(function () {
        if (self._element) {
          self._setupMessageViewStream();
        }
      }, 500);
      return;
    }

    var messageContainer: HTMLElement = openMessage.parentElement as any;

    this._initializeExistingMessages(messageContainer);

    this._observeNewMessages(messageContainer);
  }

  _initializeExistingMessages(messageContainer: any) {
    var self = this;
    var children = messageContainer.children;
    Array.prototype.forEach.call(children, function (childElement) {
      self._createMessageView(childElement);
    });
  }

  _observeNewMessages(messageContainer: any) {
    this._newMessageMutationObserver = new MutationObserver(
      this._handleNewMessageMutations.bind(this)
    );

    this._newMessageMutationObserver.observe(messageContainer, {
      childList: true,
    });
  }

  _handleNewMessageMutations(mutations: MutationRecord[]) {
    var self = this;
    mutations.forEach(function (mutation) {
      Array.prototype.forEach.call(mutation.addedNodes, function (addedNode) {
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
      view: messageView,
    });
  }

  _setupWidthManager() {
    let widthManager = this._widthManager;

    if (!widthManager) {
      const addonSidebarElement =
        GmailElementGetter.getAddonSidebarContainerElement();
      if (!addonSidebarElement)
        throw new Error('addonSidebarElement not found');
      const mainContentBodyContainerElement =
        GmailElementGetter.getMainContentBodyContainerElement();
      if (!mainContentBodyContainerElement)
        throw new Error('mainContentBodyContainerElement not found');
      const contentContainer = mainContentBodyContainerElement.parentElement;
      if (!contentContainer)
        throw new Error(
          'mainContentBodyContainerElement has no parent element'
        );
      this._widthManager = widthManager = new WidthManager(
        contentContainer as any,
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
          ? (container.parentElement as any).style.display === 'none'
          : null,
        self: container.style.display === 'none',
        children: Array.from(container.children).map((el) =>
          (el as HTMLElement).style
            ? (el as HTMLElement).style.display === 'none'
            : null
        ),
      };
      const rect = container.getBoundingClientRect();
      const size = {
        width: rect.width,
        height: rect.height,
      };
      return {
        isDisplayNone,
        size,
      };
    }

    const eventData = {
      time: {} as any,
    };
    eventData.time[0] = readInfo();
    await Promise.all(
      [30, 5000].map(async (time) => {
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
    const expandAllElementImg =
      this._element.querySelector<HTMLElement>('img.gx');

    if (expandAllElementImg) {
      const expandAllElement = findParent(
        expandAllElementImg,
        (el) => el.getAttribute('role') === 'button'
      );

      if (expandAllElement) {
        Kefir.merge([
          Kefir.fromEvents(expandAllElement, 'click'),
          Kefir.fromEvents<KeyboardEvent, unknown>(
            expandAllElement,
            'keydown'
          ).filter(
            (e) => e.which === 13
            /* enter */
          ),
        ])
          .takeUntilBy(this._stopper)
          .onValue(() => {
            for (const customMessageView of this._customMessageViews) {
              customMessageView.expand();
            }
          });
      }
    }

    //collapse all
    const collapseAllElementImg =
      this._element.querySelector<HTMLElement>('img.gq');

    if (collapseAllElementImg) {
      const collapseAllElement = findParent(
        collapseAllElementImg,
        (el) => el.getAttribute('role') === 'button'
      );

      if (collapseAllElement) {
        Kefir.merge([
          Kefir.fromEvents(collapseAllElement, 'click'),
          Kefir.fromEvents<KeyboardEvent, unknown>(
            collapseAllElement,
            'keydown'
          ).filter(
            (e) => e.which === 13
            /* enter */
          ),
        ])
          .takeUntilBy(this._stopper)
          .onValue(() => {
            for (const customMessageView of this._customMessageViews) {
              customMessageView.collapse();
            }
          });
      }
    }
  }
}

export default GmailThreadView;
