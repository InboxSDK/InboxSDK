import delay from 'pdelay';
import * as Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import type { Bus } from 'kefir-bus';
import findParent from '../../../../common/find-parent';
import isElementVisible from '../../../../common/isElementVisible';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
import querySelector, {
  SelectorError,
} from '../../../lib/dom/querySelectorOrFail';
import idMap from '../../../lib/idMap';
import SimpleElementView from '../../../views/SimpleElementView';
import CustomMessageView from '../../../views/conversations/custom-message-view';
import type GmailDriver from '../gmail-driver';
import GmailElementGetter from '../gmail-element-getter';
import GmailMessageView from './gmail-message-view';
import GmailToolbarView from './gmail-toolbar-view';
import type { CustomMessageDescriptor } from '../../../views/conversations/custom-message-view';
import { type ContentPanelDescriptor } from '../../../driver-common/sidebar/ContentPanelViewDriver';
import isStreakAppId from '../../../lib/isStreakAppId';
import censorHTMLstring from '../../../../common/censorHTMLstring';
import type GmailRouteView from './gmail-route-view/gmail-route-view';
import ButtonView from '../widgets/buttons/button-view';
import BasicButtonViewController, {
  type Options,
} from '../../../widgets/buttons/basic-button-view-controller';
import { type ButtonDescriptor } from '../../../../inboxsdk';
import censorHTMLtree from '../../../../common/censorHTMLtree';

let hasLoggedAddonInfo = false;

class GmailThreadView {
  #element: HTMLElement;
  #routeViewDriver: any;
  #driver: GmailDriver;
  #isPreviewedThread: boolean;
  #eventStream: Bus<any, unknown>;
  #stopper = kefirStopper();
  #toolbarView?: GmailToolbarView;
  #messageViewDrivers: any[];
  #newMessageMutationObserver: MutationObserver | null | undefined;
  #readyStream: Kefir.Observable<any, unknown>;
  #threadID: string | null | undefined;
  #syncThreadID: string | null | undefined;
  #customMessageViews: Set<CustomMessageView> = new Set();
  #hiddenCustomMessageViews: Set<CustomMessageView> = new Set();
  #hiddenCustomMessageNoticeProvider:
    | ((
        numberCustomMessagesHidden: number,
        numberNativeMessagesHidden: number | null | undefined,
        unmountPromise: Promise<void>,
      ) => HTMLElement | null | undefined)
    | null
    | undefined;
  #hiddenCustomMessageNoticeElement: HTMLElement | null | undefined;
  #resolveUnmountHiddenNoticePromise: (() => void) | null | undefined;

  constructor(
    element: HTMLElement,
    routeViewDriver: GmailRouteView,
    driver: GmailDriver,
    isPreviewedThread: boolean = false,
  ) {
    this.#element = element;
    this.#routeViewDriver = routeViewDriver;
    this.#driver = driver;
    this.#isPreviewedThread = isPreviewedThread;
    this.#eventStream = kefirBus();
    this.#messageViewDrivers = [];

    this.#logAddonElementInfo().catch((err) =>
      this.#driver.getLogger().error(err),
    );

    const waitForSidebarReady = this.#driver
      .waitForGlobalSidebarReady()
      .merge(
        this.#driver
          .delayToTimeAfterReady(15 * 1000)
          .flatMap(() =>
            Kefir.constantError(
              new Error('15 second timeout while waiting for sidebar fired'),
            ),
          ),
      )
      .take(1)
      .takeErrors(1)
      .flatMapErrors((err) => {
        this.#driver.getLogger().error(err);

        return Kefir.constant(null);
      })
      .toProperty();

    let combinedReadyStream;

    if (driver.getOpts().REQUESTED_API_VERSION === 1) {
      combinedReadyStream = Kefir.combine([
        waitForSidebarReady,
        Kefir.fromPromise(this.getThreadIDAsync()),
      ]);
    } else {
      combinedReadyStream = waitForSidebarReady;
    }

    this.#readyStream = combinedReadyStream
      .map(() => {
        this.#setupToolbarView();

        this.#setupMessageViewStream();

        return null;
      })
      .takeUntilBy(this.#stopper)
      .toProperty();

    this.#listenToExpandCollapseAll();

    this.#stopper.take(1).onValue(() => {
      if (this.#resolveUnmountHiddenNoticePromise) {
        this.#resolveUnmountHiddenNoticePromise();
      }
    });
  }

  // TODO use livesets eventually
  getMessageViewDriverStream(): Kefir.Observable<GmailMessageView, unknown> {
    return Kefir.constant(this.#messageViewDrivers)
      .flatten()
      .merge(
        this.#eventStream
          .filter(
            (event) =>
              event.type === 'internal' && event.eventName === 'messageCreated',
          )
          .map((event) => event.view),
      ) as any;
  }

  isLoadingStub() {
    return false;
  }

  getStopper() {
    return this.#stopper;
  }

  getEventStream(): Kefir.Observable<Record<string, any>, unknown> {
    return this.#eventStream;
  }

  getElement(): HTMLElement {
    return this.#element;
  }

  getRouteViewDriver(): any {
    return this.#routeViewDriver;
  }

  getIsPreviewedThread(): boolean {
    return this.#isPreviewedThread;
  }

  getToolbarView() {
    return this.#toolbarView;
  }

  getMessageViewDrivers(): GmailMessageView[] {
    return this.#messageViewDrivers;
  }

  destroy() {
    this.#eventStream.end();

    this.#stopper.destroy();

    if (this.#toolbarView) this.#toolbarView.destroy();

    this.#messageViewDrivers.forEach((messageView) => {
      messageView.destroy();
    });

    this.#messageViewDrivers.length = 0;

    if (this.#newMessageMutationObserver) {
      this.#newMessageMutationObserver.disconnect();
    }

    for (const customMessageView of this.#customMessageViews) {
      customMessageView.destroy();
    }
  }

  addSidebarContentPanel(
    descriptor: Kefir.Observable<ContentPanelDescriptor, unknown>,
  ) {
    const sidebar = this.#driver.getGlobalSidebar();

    return sidebar.addThreadSidebarContentPanel(descriptor, this);
  }

  #subjectContainerSelectors = {
    '2022_10_21': '.a98.iY > .nH',
    '2022_10_12': '.PeIF1d > .nH',
    [2018]: '.if > .nH',
  };

  #subjectContainerSelectorsAfterNov162023 = {
    '2023_11_16': '* > .nH',
  };

  #subjectAISuggestionsContainerSelectors = {
    '2024_04_26': '.nH > .einvLd',
  };

  addNoticeBar(): SimpleElementView {
    const el = document.createElement('div');
    el.className = idMap('thread_noticeBar');
    let version;
    let subjectContainer;

    let selectorsToTry: Record<string, string> =
      this.#subjectContainerSelectors;

    if (this.#element.matches('.a98.iY')) {
      // thread view gmail update Nov 16, 2023
      selectorsToTry = this.#subjectContainerSelectorsAfterNov162023;
    }

    for (const [currentVersion, selector] of Object.entries(selectorsToTry)) {
      const el = this.#element.querySelector(selector);

      if (!el) {
        continue;
      }

      version = currentVersion;
      subjectContainer = el;
      break;
    }

    if (!subjectContainer) throw new Error('Failed to find subject container');

    this.#driver.getLogger().eventSdkPassive('addNoticeBar subjectContainer', {
      version,
    });

    // AI suggestions container could be rendered after the subject container so
    // if present, we need to adjust spacing when inserting the notice bar in between subject and AI suggestions
    for (const [currentVersion, selector] of Object.entries(
      this.#subjectAISuggestionsContainerSelectors,
    )) {
      const hasAIButtonsSubjectContainer =
        !!this.#element.querySelector(selector);

      if (!hasAIButtonsSubjectContainer) {
        continue;
      }

      this.#driver
        .getLogger()
        .eventSdkPassive('addNoticeBar AIButtonsSubjectContainer', {
          version: currentVersion,
        });

      // AI suggestions container is present, adjust spacing of notice bar by the same amount as the subject container bottom spacing for consistency
      el.style.marginBottom = '8px';

      break;
    }

    subjectContainer.insertAdjacentElement('afterend', el);
    const view = new SimpleElementView(el);

    this.#stopper
      .takeUntilBy(Kefir.fromEvents(view, 'destroy'))
      .onValue(() => view.destroy());

    return view;
  }

  registerHiddenCustomMessageNoticeProvider(
    provider: (
      numberCustomMessagesHidden: number,
      numberNativeMessagesHidden: number | null | undefined,
      unmountPromise: Promise<void>,
    ) => HTMLElement,
  ) {
    this.#hiddenCustomMessageNoticeProvider = provider;
  }

  addCustomMessage(
    descriptorStream: Kefir.Observable<CustomMessageDescriptor, unknown>,
  ): CustomMessageView {
    const parentElement = this.#element.parentElement;
    if (!parentElement) throw new Error('missing parent element');
    const customMessageView = new CustomMessageView(descriptorStream, () => {
      this.#readyStream.onValue(async () => {
        const messageContainer = this.#element.querySelector('[role=list]');

        if (!messageContainer) return;
        let mostRecentDate = Number.MIN_SAFE_INTEGER;
        let insertBeforeMessage;
        let isInHidden = false;
        const messages = [
          ...(await Promise.all(
            this.#messageViewDrivers.map(async (messageView) => ({
              sortDatetime: (await messageView.getDate()) || 0,
              isHidden: messageView.getViewState() === 'HIDDEN',
              element: messageView.getElement(),
            })),
          )),
          ...Array.from(this.#customMessageViews)
            .filter(
              (cmv) =>
                cmv !== customMessageView && cmv.getElement().parentElement,
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
            customMessageView.getElement(),
          );
        else
          messageContainer.insertAdjacentElement(
            'beforeend',
            customMessageView.getElement(),
          );

        if (isInHidden) {
          this.#setupHiddenCustomMessage(customMessageView);
        }

        parentElement.classList.add('inboxsdk__thread_view_with_custom_view');
      });
    });

    this.#customMessageViews.add(customMessageView);

    customMessageView.on('destroy', () => {
      this.#customMessageViews.delete(customMessageView);

      if (this.#customMessageViews.size > 0)
        parentElement.classList.add('inboxsdk__thread_view_with_custom_view');
      else
        parentElement.classList.remove(
          'inboxsdk__thread_view_with_custom_view',
        );
    });
    return customMessageView;
  }

  #setupHiddenCustomMessage(customMessageView: CustomMessageView) {
    this.#hiddenCustomMessageViews.add(customMessageView);

    // hide the element
    customMessageView
      .getElement()
      .classList.add('inboxsdk__custom_message_view_hidden');

    // get the message element that contains the hidden messages notice
    let hiddenNoticeMessageElement =
      this.#element.querySelector<HTMLElement>('.adv');

    let nativeHiddenNoticePresent = true;

    if (!hiddenNoticeMessageElement) {
      nativeHiddenNoticePresent = false;
      const superCollapsedMessageElements = Array.from(
        this.#element.querySelectorAll<HTMLElement>('.kQ'),
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
          this.#stopper,
          Kefir.fromEvents(customMessageView, 'destroy'),
        ]),
      )
      .filter(
        () =>
          (hiddenNoticeMessageElement &&
            !hiddenNoticeMessageElement.classList.contains('kQ')) as boolean,
      ) //when kQ is gone, message is visible
      .onValue(() => {
        customMessageView
          .getElement()
          .classList.remove('inboxsdk__custom_message_view_hidden');
        if (this.#hiddenCustomMessageNoticeElement)
          this.#hiddenCustomMessageNoticeElement.remove();
        this.#hiddenCustomMessageNoticeElement = null;
      });

    this.#updateHiddenNotice(
      hiddenNoticeMessageElement,
      nativeHiddenNoticePresent,
    );

    Kefir.fromEvents(customMessageView, 'destroy')
      .takeUntilBy(this.#stopper)
      .take(1)
      .onValue(() => {
        this.#hiddenCustomMessageViews.delete(customMessageView);

        if (hiddenNoticeMessageElement)
          this.#updateHiddenNotice(
            hiddenNoticeMessageElement,
            nativeHiddenNoticePresent,
          );
      });
  }

  #updateHiddenNotice(
    hiddenNoticeMessageElement: HTMLElement,
    nativeHiddenNoticePresent: boolean,
  ) {
    const existingAppNoticeElement = this.#hiddenCustomMessageNoticeElement;

    if (existingAppNoticeElement) {
      existingAppNoticeElement.remove();
      this.#hiddenCustomMessageNoticeElement = null;
      if (this.#resolveUnmountHiddenNoticePromise)
        this.#resolveUnmountHiddenNoticePromise();
    }

    const noticeProvider = this.#hiddenCustomMessageNoticeProvider;
    if (!noticeProvider) return;
    const appNoticeContainerElement = (this.#hiddenCustomMessageNoticeElement =
      document.createElement('span'));
    appNoticeContainerElement.classList.add(
      'inboxsdk__custom_message_view_app_notice_content',
    );
    const numberCustomHiddenMessages = this.#hiddenCustomMessageViews.size;
    let numberNativeHiddenMessages = null;

    if (nativeHiddenNoticePresent) {
      const nativeHiddenNoticeCountSpan = querySelector(
        hiddenNoticeMessageElement,
        '.adx span',
      );
      numberNativeHiddenMessages = Number(
        nativeHiddenNoticeCountSpan.innerHTML,
      );

      if (isNaN(numberNativeHiddenMessages)) {
        throw new Error(
          "Couldn't find number of native hidden messages in dom structure",
        );
      }
    }

    const appNoticeElement = noticeProvider(
      numberCustomHiddenMessages,
      numberNativeHiddenMessages,
      new Promise((resolve) => {
        this.#resolveUnmountHiddenNoticePromise = resolve;
      }),
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
      '.adx',
    );
    hiddenNoticeElement.classList.add(
      'inboxsdk__custom_message_view_app_notice_container',
    );
    hiddenNoticeElement.appendChild(appNoticeContainerElement);
  }

  getSubject(): string {
    var subjectElement = this.#element.querySelector('.ha h2');

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
    return this.#syncThreadID || this.getThreadID();
  }

  // Follows a similar structure to getThreadIDAsync, but gives up if async work is needed
  getThreadID(): string {
    if (this.#threadID) return this.#threadID;
    let threadID;

    const idElement = this.#element.querySelector('[data-thread-perm-id]');

    if (!idElement) throw new Error('threadID element not found');

    // the string value can be 'undefined'
    const attributeValue = idElement.getAttribute('data-thread-perm-id');
    const syncThreadID = (this.#syncThreadID =
      typeof attributeValue === 'string' && attributeValue !== 'undefined'
        ? attributeValue
        : null);
    if (!syncThreadID) {
      const err = new Error('syncThreadID attribute with no value');
      this.#driver.getLogger().error(err);
    }
    threadID = idElement.getAttribute('data-legacy-thread-id');

    if (!threadID) {
      const err = new Error(
        'Failed to get id for thread: data-legacy-thread-id attribute missing',
      );

      this.#driver.getLogger().error(err); // throw err;
      // Fall back to old behavior instead of throwing. Probably not super sensible, but
      // this is a deprecated method and preserving the current behavior is
      // probably an okay choice.
    }

    if (!threadID) {
      if (this.#isPreviewedThread) {
        threadID = this.#driver
          .getPageCommunicator()
          .getCurrentThreadID(this.#element, true);
      } else {
        const params = this.#routeViewDriver
          ? this.#routeViewDriver.getParams()
          : null;

        if (params && params.threadID) {
          threadID = params.threadID;
        } else {
          const err = new Error('Failed to get id for thread');

          this.#driver.getLogger().error(err);

          throw err;
        }
      }
    }

    this.#threadID = threadID;
    return threadID;
  }

  async getThreadIDAsync(): Promise<string> {
    let threadID;

    const idElement = this.#element.querySelector('[data-thread-perm-id]');

    if (!idElement) throw new Error('threadID element not found');

    // the string value can be 'undefined'
    const attributeValue = idElement.getAttribute('data-thread-perm-id');
    const syncThreadID = (this.#syncThreadID =
      typeof attributeValue === 'string' && attributeValue !== 'undefined'
        ? attributeValue
        : null);
    if (!syncThreadID) {
      const err = new Error('syncThreadID attribute with no value');
      this.#driver.getLogger().error(err);
    }
    this.#threadID = threadID = idElement.getAttribute('data-legacy-thread-id');

    if (!threadID && syncThreadID) {
      this.#threadID = threadID =
        await this.#driver.getOldGmailThreadIdFromSyncThreadId(syncThreadID);
    }

    if (this.#threadID) return this.#threadID;
    else throw new Error('Failed to get id for thread');
  }

  addLabel(): SimpleElementView {
    const labelContainer = this.#element.querySelector('.ha .J-J5-Ji');

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
            mutation.removedNodes.length > 0,
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

    this.#stopper
      .takeUntilBy(Kefir.fromEvents(view, 'destroy'))
      .onValue(() => view.destroy());

    Kefir.fromEvents(view, 'destroy')
      .take(1)
      .onValue(() => {
        observer.disconnect();
      });
    return view;
  }

  addSubjectButton(button: ButtonDescriptor) {
    const subjectParent = this.#element.querySelector('.V8djrc.byY');
    if (!subjectParent) {
      throw new SelectorError('.V8djrc.byY', {
        cause: 'Subject wrapper element not found',
      });
    }

    const buttonOptions = {
      buttonView: new ButtonView(button),
      activateFunction: button.activateFunction,
      onClick: button.onClick,
    } satisfies Options;
    const buttonElement = buttonOptions.buttonView.getElement();

    // Sometimes it is there right away
    const subjectToolbarElement = this.#findSubjectToolbarElement();
    if (subjectToolbarElement) {
      subjectToolbarElement.prepend(buttonElement);
    }

    // Sometimes the container is lazy loaded or re-loaded, so we observe too
    const observer = new MutationObserver((mutationsList) => {
      if (mutationsList.some((mutation) => mutation.type === 'childList')) {
        const subjectToolbarElement = this.#findSubjectToolbarElement();
        if (
          subjectToolbarElement &&
          !subjectToolbarElement.contains(buttonElement)
        ) {
          subjectToolbarElement.prepend(buttonElement);
        }
      }
    });
    observer.observe(subjectParent, {
      childList: true,
      subtree: true,
    });

    this.#stopper
      .takeUntilBy(Kefir.fromEvents(buttonElement, 'destroy'))
      .onValue(() => buttonOptions.buttonView.destroy());

    Kefir.fromEvents(buttonElement, 'destroy')
      .take(1)
      .onValue(() => {
        observer.disconnect();
      });

    return new BasicButtonViewController(buttonOptions);
  }

  addFooterButton(button: ButtonDescriptor) {
    const messagesSelector = 'div.nH .aHU';
    const messagesContainer = this.#element.querySelector(messagesSelector);
    if (!messagesContainer) {
      this.#driver.getLogger().eventSdkPassive('Footer button selector fail', {
        html: censorHTMLtree(this.#element),
      });
      throw new SelectorError(messagesSelector, {
        cause: 'Last message footer element not found',
      });
    }

    const buttonOptions = {
      buttonView: new ButtonView(button),
      activateFunction: button.activateFunction,
      onClick: button.onClick,
    } satisfies Options;
    const buttonElement = buttonOptions.buttonView.getElement();

    // Sometimes it is there right away
    const subjectToolbarElement = this.#findBottomReplyToolbarElement();
    if (subjectToolbarElement) {
      subjectToolbarElement.appendChild(buttonElement);
    }

    // Sometimes the container is lazy loaded or re-loaded, so we observe too
    const observer = new MutationObserver((mutationsList) => {
      if (mutationsList.some((mutation) => mutation.type === 'childList')) {
        const subjectToolbarElement = this.#findBottomReplyToolbarElement();
        if (
          subjectToolbarElement &&
          !subjectToolbarElement.contains(buttonElement)
        ) {
          subjectToolbarElement.appendChild(buttonElement);
        }
      }
    });
    observer.observe(messagesContainer, {
      childList: true,
      subtree: true,
    });

    this.#stopper
      .takeUntilBy(Kefir.fromEvents(buttonElement, 'destroy'))
      .onValue(() => buttonOptions.buttonView.destroy());

    Kefir.fromEvents(buttonElement, 'destroy')
      .take(1)
      .onValue(() => {
        observer.disconnect();
      });

    return new BasicButtonViewController(buttonOptions);
  }

  #setupToolbarView() {
    const toolbarElement = this.#findToolbarElement();

    if (!toolbarElement) {
      if (isStreakAppId(this.#driver.getAppId())) {
        const threadViewEl = document.querySelector('.nH.bkK');
        if (threadViewEl instanceof HTMLElement) {
          this.#driver
            .getLogger()
            .error(new Error('Thread view toolbar cannot be found'), {
              threadViewHtml: censorHTMLstring(threadViewEl.innerHTML),
            });
        } else {
          const pageHtml = document.querySelector('.nH');

          if (pageHtml instanceof HTMLElement) {
            this.#driver
              .getLogger()
              .error(new Error('Thread view toolbar cannot be found'), {
                threadViewHtml: '.nH.bkK cannot be found',
                pageHtml: censorHTMLstring(pageHtml.innerHTML),
              });
          } else {
            this.#driver
              .getLogger()
              .error(new Error('Thread view toolbar cannot be found'), {
                threadViewHtml: '.nH.bkK cannot be found',
                pageHtml: '.nH cannot be found',
              });
          }
        }
      }

      throw new Error('No toolbar element found');
    }

    const toolbarParent = toolbarElement.parentElement;
    if (toolbarParent)
      toolbarParent.classList.add('inboxsdk__thread_toolbar_parent');
    this.#toolbarView = new GmailToolbarView(
      toolbarElement,
      this.#driver,
      this.#routeViewDriver,
      this,
    );
  }

  #findToolbarElement(): HTMLElement | null | undefined {
    var toolbarContainerElements =
      document.querySelectorAll<HTMLElement>('[gh=tm]');

    for (var ii = 0; ii < toolbarContainerElements.length; ii++) {
      if (this.#isToolbarContainerRelevant(toolbarContainerElements[ii])) {
        return toolbarContainerElements[ii].querySelector<HTMLElement>(
          '[gh=mtb]',
        );
      }
    }

    return null;
  }

  #findSubjectToolbarElement(): HTMLElement | null {
    var toolbarContainerElement =
      this.#element.querySelector<HTMLElement>('.bHJ');
    return toolbarContainerElement;
  }

  #findBottomReplyToolbarElement(): HTMLElement | null {
    // Get all .amn elements (may exist in multiple locations due to A/B testing)
    var allAmnElements = this.#element.querySelectorAll<HTMLElement>('.amn');

    // Find the visible .amn element (handles A/B testing where one might be hidden)
    for (const element of allAmnElements) {
      if (isElementVisible(element)) {
        return element;
      }
    }

    // Fallback to the first one if no visible element found
    return allAmnElements[0] || null;
  }

  #isToolbarContainerRelevant(toolbarContainerElement: HTMLElement): boolean {
    if (
      toolbarContainerElement.parentElement!.parentElement ===
      this.#element.parentElement!.parentElement
    ) {
      return true;
    }

    if (
      toolbarContainerElement.parentElement!.getAttribute('role') !== 'main' &&
      this.#element.parentElement!.getAttribute('role') !== 'main'
    ) {
      return true;
    }

    if (
      toolbarContainerElement.parentElement!.getAttribute('role') === 'main' &&
      toolbarContainerElement.parentElement!.querySelector(
        '.if, .PeIF1d, .a98.iY',
      ) &&
      (toolbarContainerElement.parentElement!.querySelector(
        '.if, .PeIF1d, .a98.iY',
      )!.parentElement === this.#element ||
        toolbarContainerElement.parentElement!.querySelector('.a98.iY') ===
          this.#element)
    ) {
      let version = '2018';

      if (this.#element.matches('.a98.iY')) {
        version = '2023-11-16';
      } else if (
        toolbarContainerElement.parentElement!.querySelector('.a98.iY')
      ) {
        version = '2022-10-20';
      } else if (
        toolbarContainerElement.parentElement!.querySelector('.PeIF1d')
      ) {
        version = '2022-10-12';
      }

      this.#driver
        .getLogger()
        .eventSdkPassive('gmailThreadView_isToolbarContainerRelevant', {
          version,
        });

      return true;
    }

    return false;
  }

  #setupMessageViewStream() {
    var openMessage = this.#element.querySelector('.h7');

    if (!openMessage) {
      var self = this;
      setTimeout(function () {
        if (self.#element) {
          self.#setupMessageViewStream();
        }
      }, 500);
      return;
    }

    var messageContainer: HTMLElement = openMessage.parentElement as any;

    this.#initializeExistingMessages(messageContainer);

    this.#observeNewMessages(messageContainer);
  }

  #initializeExistingMessages(messageContainer: any) {
    var self = this;
    var children = messageContainer.children;
    Array.prototype.forEach.call(children, function (childElement) {
      self.#createMessageView(childElement);
    });
  }

  #observeNewMessages(messageContainer: any) {
    this.#newMessageMutationObserver = new MutationObserver(
      this.#handleNewMessageMutations.bind(this),
    );

    this.#newMessageMutationObserver.observe(messageContainer, {
      childList: true,
    });
  }

  #handleNewMessageMutations(mutations: MutationRecord[]) {
    var self = this;
    mutations.forEach(function (mutation) {
      Array.prototype.forEach.call(mutation.addedNodes, function (addedNode) {
        if (!addedNode.classList.contains('inboxsdk__custom_message_view'))
          self.#createMessageView(addedNode);
      });
    });
  }

  #createMessageView(messageElement: HTMLElement) {
    var messageView = new GmailMessageView(messageElement, this, this.#driver);

    this.#eventStream.plug(messageView.getEventStream());

    this.#messageViewDrivers.push(messageView);

    this.#eventStream.emit({
      type: 'internal',
      eventName: 'messageCreated',
      view: messageView,
    });
  }

  getReadyStream() {
    return this.#readyStream;
  }

  async #logAddonElementInfo() {
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
            : null,
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
        if (this.#stopper.stopped) return;
        eventData.time[time] = readInfo();
      }),
    );
    if (this.#stopper.stopped) return;

    this.#driver
      .getLogger()
      .eventSdkPassive('gmailSidebarElementInfo', eventData);

    hasLoggedAddonInfo = true;
  }

  #listenToExpandCollapseAll() {
    //expand all
    const expandAllElementImg =
      this.#element.querySelector<HTMLElement>('img.gx');

    if (expandAllElementImg) {
      const expandAllElement = findParent(
        expandAllElementImg,
        (el) => el.getAttribute('role') === 'button',
      );

      if (expandAllElement) {
        Kefir.merge([
          Kefir.fromEvents(expandAllElement, 'click'),
          Kefir.fromEvents<KeyboardEvent, unknown>(
            expandAllElement,
            'keydown',
          ).filter(
            (e) => e.which === 13,
            /* enter */
          ),
        ])
          .takeUntilBy(this.#stopper)
          .onValue(() => {
            for (const customMessageView of this.#customMessageViews) {
              customMessageView.expand();
            }
          });
      }
    }

    //collapse all
    const collapseAllElementImg =
      this.#element.querySelector<HTMLElement>('img.gq');

    if (collapseAllElementImg) {
      const collapseAllElement = findParent(
        collapseAllElementImg,
        (el) => el.getAttribute('role') === 'button',
      );

      if (collapseAllElement) {
        Kefir.merge([
          Kefir.fromEvents(collapseAllElement, 'click'),
          Kefir.fromEvents<KeyboardEvent, unknown>(
            collapseAllElement,
            'keydown',
          ).filter(
            (e) => e.which === 13,
            /* enter */
          ),
        ])
          .takeUntilBy(this.#stopper)
          .onValue(() => {
            for (const customMessageView of this.#customMessageViews) {
              customMessageView.collapse();
            }
          });
      }
    }
  }
}

export default GmailThreadView;
