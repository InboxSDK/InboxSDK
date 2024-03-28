/* eslint-disable @typescript-eslint/no-var-requires */

import autoHtml from 'auto-html';
import t from 'transducers.js';
import once from 'lodash/once';
import escape from 'lodash/escape';
import constant from 'lodash/constant';
import find from 'lodash/find';
import asap from 'asap';
import delay from 'pdelay';
import * as Kefir from 'kefir';
import closest from 'closest-ng';
import kefirBus from 'kefir-bus';
import type { Bus } from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import type { Stopper } from 'kefir-stopper';
import delayAsap from '../../../lib/delay-asap';
import { simulateClick } from '../../../lib/dom/simulate-mouse-event';
import simulateKey from '../../../lib/dom/simulate-key';
import querySelector from '../../../lib/dom/querySelectorOrFail';
import isElementVisible from '../../../../common/isElementVisible';
import makeElementChildStream from '../../../lib/dom/make-element-child-stream';
import {
  simulateDragOver,
  simulateDrop,
  simulateDragEnd,
} from '../../../lib/dom/simulate-drag-and-drop';
import GmailElementGetter from '../gmail-element-getter';
import setCss from '../../../lib/dom/set-css';
import waitFor from '../../../lib/wait-for';
import streamWaitFor from '../../../lib/stream-wait-for';
import handleComposeLinkChips from '../../../lib/handle-compose-link-chips';
import insertLinkChipIntoBody from '../../../lib/insert-link-chip-into-body';
import addComposeNotice from './gmail-compose-view/add-compose-notice';
import addStatusBar from './gmail-compose-view/add-status-bar';
import insertHTMLatCursor from '../../../lib/dom/insert-html-at-cursor';
import ensureGroupingIsOpen from './gmail-compose-view/ensure-grouping-is-open';
import ensureAppButtonToolbarsAreClosed from './gmail-compose-view/ensure-app-button-toolbars-are-closed';
import sizeFixer from './gmail-compose-view/size-fixer';
import addTooltipToButton from './gmail-compose-view/add-tooltip-to-button';
import addRecipientRow from './gmail-compose-view/add-recipient-row';
import addButton, {
  type AddedButtonEvents,
} from './gmail-compose-view/add-button';
import setRecipients from './gmail-compose-view/set-recipients';
import focus from './gmail-compose-view/focus';
import monitorSelectionRange from './gmail-compose-view/monitor-selection-range';
import manageButtonGrouping from './gmail-compose-view/manage-button-grouping';
import type { TooltipDescriptor } from '../../../views/compose-button-view';
import {
  getSelectedHTMLInElement,
  getSelectedTextInElement,
} from '../../../lib/dom/get-selection';
import getMinimizedStream from './gmail-compose-view/get-minimized-stream';
import censorHTMLstring from '../../../../common/censorHTMLstring';
import insertLinkIntoBody from './gmail-compose-view/insert-link-into-body';
import getAddressChangesStream from './gmail-compose-view/get-address-changes-stream';
import getBodyChangesStream from './gmail-compose-view/get-body-changes-stream';
import getRecipients from './gmail-compose-view/get-recipients';
import getResponseTypeChangesStream from './gmail-compose-view/get-response-type-changes-stream';
import getPresendingStream from '../../../driver-common/compose/getPresendingStream';
import getDiscardStream from '../../../driver-common/compose/getDiscardStream';
import updateInsertMoreAreaLeft from './gmail-compose-view/update-insert-more-area-left';
import setupLinkPopOvers from './gmail-compose-view/setupLinkPopovers';
import getFormattingAreaOffsetLeft from './gmail-compose-view/get-formatting-area-offset-left';
import overrideEditSubject from './gmail-compose-view/override-edit-subject';
import detectClassicRecipientsArea from './gmail-compose-view/detectClassicRecipientsArea';
import {
  makePageParser,
  getRecipientRowElements,
} from './gmail-compose-view/page-parser';
import type PageParserTree from 'page-parser-tree';
import type { TagTree } from 'tag-tree';
import * as fromManager from './gmail-compose-view/from-manager';
import type {
  ComposeButtonDescriptor,
  ComposeNotice,
  ComposeViewDriverEvent,
  StatusBar,
} from '../../../driver-interfaces/compose-view-driver';
import type GmailDriver from '../gmail-driver';
import { Contact } from '../../../../inboxsdk';
import BasicButtonViewController from '../../../widgets/buttons/basic-button-view-controller';
import { type PublicOnly } from '../../../../types/public-only';
import isNotNil from '../../../../common/isNotNil';

let hasReportedMissingBody = false;

type RequestModifier = Parameters<
  GmailComposeView['registerRequestModifier']
>[0];

class GmailComposeView {
  #element: HTMLElement;
  #seenBodyElement!: HTMLElement;
  #isInlineReplyForm: boolean;
  #isFullscreen: boolean;
  #isStandalone: boolean;
  #driver: GmailDriver;
  #managedViewControllers: Array<{
    destroy(): void;
  }>;
  #eventStream: Bus<ComposeViewDriverEvent, unknown>;
  #isTriggeringADraftSavePending: boolean;
  #buttonViewControllerTooltipMap: WeakMap<
    Record<string, any>,
    Record<string, any>
  >;
  #composeID!: string;
  #messageIDElement!: HTMLInputElement;
  #messageId: string | null | undefined;

  #initialMessageId: string | null | undefined;
  #targetMessageID: string | null | undefined;
  #draftIDpromise: Promise<string | null | undefined> | null | undefined;
  #threadID: string | null | undefined;
  #stopper: Stopper;
  #lastSelectionRange: Range | null | undefined;
  #requestModifiers: Record<string, RequestModifier>;
  #isListeningToAjaxInterceptStream: boolean;
  #formattingArea: HTMLElement | null | undefined;
  #closedProgrammatically = false;
  #destroyed = false;
  #removedFromDOMStopper: Stopper;
  #hasSetupLinkPopOvers = false;
  #page: PageParserTree;
  tagTree: TagTree<HTMLElement>;
  ready: () => Kefir.Observable<GmailComposeView, unknown>;

  constructor(
    element: HTMLElement,
    xhrInterceptorStream: Kefir.Observable<any, unknown>,
    driver: GmailDriver,
    options: {
      isInlineReplyForm: boolean;
      isStandalone: boolean;
    },
  ) {
    this.#element = element;

    this.#element.classList.add('inboxsdk__compose');

    if (options.isInlineReplyForm) {
      this.#element.classList.add('inboxsdk__compose_inlineReply');
    }

    this.#isInlineReplyForm = options.isInlineReplyForm;
    this.#isStandalone = options.isStandalone;
    this.#isFullscreen = false;
    this.#messageId = null;
    this.#draftIDpromise = null;
    this.#driver = driver;
    this.#stopper = kefirStopper();
    this.#managedViewControllers = [];
    this.#requestModifiers = {};
    this.#isListeningToAjaxInterceptStream = false;
    this.#eventStream = kefirBus();
    this.#removedFromDOMStopper = kefirStopper();
    this.#isTriggeringADraftSavePending = false;
    this.#page = makePageParser(element, driver.getLogger());
    this.tagTree = this.#page.tree;
    const saveAndSendStream = xhrInterceptorStream
      // we know _getDraftIDfromForm will work because by the time we're
      // getting an ajax event Gmail's JS has generated an ID and added it to the DOM.
      .filter((event) => event.draftID === this.#getDraftIDfromForm())
      .map((event) => {
        switch (event.type) {
          case 'emailSending': {
            return {
              eventName: 'sending',
            };
          }

          case 'emailSent': {
            const syncThreadID = event.threadID;
            const syncMessageID = event.messageID;
            if (event.oldMessageID) this.#messageId = event.oldMessageID;
            if (event.oldThreadID) this.#threadID = event.oldThreadID;
            driver.removeCachedGmailMessageIdForSyncMessageId(syncMessageID);
            driver.removeCachedOldGmailThreadIdFromSyncThreadId(syncThreadID);
            return {
              eventName: 'sent',
              data: {
                getThreadID: once(async (): Promise<string> => {
                  if (event.oldThreadID) {
                    return event.oldThreadID;
                  }

                  return await driver.getOldGmailThreadIdFromSyncThreadId(
                    syncThreadID,
                  );
                }),
                getMessageID: once(async (): Promise<string> => {
                  if (event.oldMessageID) {
                    return event.oldMessageID;
                  }

                  return await driver.getGmailMessageIdForSyncMessageId(
                    syncMessageID,
                  );
                }),
              },
            };
          }

          case 'emailSendFailed': {
            return {
              eventName: 'sendCanceled',
            };
          }

          case 'emailDraftReceived': {
            this.#messageId = event.oldMessageID;
            this.#threadID = event.oldThreadID;
            return {
              eventName: 'draftSaved',
              data: {
                getThreadID() {
                  return Promise.resolve(event.oldThreadID);
                },

                getMessageID() {
                  return Promise.resolve(event.oldMessageID);
                },
              },
            };
          }

          default: {
            return null;
          }
        }
      })
      .filter(isNotNil);

    this.#eventStream.plug(
      Kefir.merge<any, any>([
        saveAndSendStream,
        Kefir.fromEvents(this.#element, 'buttonAdded').map(() => {
          return {
            eventName: 'buttonAdded',
          };
        }),
        Kefir.fromEvents(this.#element, 'resize').map(() => ({
          eventName: 'resize',
        })),
        Kefir.fromEvents(this.#element, 'composeFullscreenStateChanged').map(
          () => {
            this.#updateComposeFullscreenState();

            return {
              eventName: 'fullscreenChanged',
              data: {
                fullscreen: this.#isFullscreen,
              },
            };
          },
        ),
      ]),
    );

    Kefir.fromEvents(this.#element, 'closedProgrammatically')
      .takeUntilBy(this.#stopper)
      .onValue(() => {
        this.#closedProgrammatically = true;
      });
    this.#buttonViewControllerTooltipMap = new WeakMap();
    const initialBodyElement = this.getMaybeBodyElement();
    this.ready = constant(
      (initialBodyElement
        ? Kefir.constant(initialBodyElement)
        : streamWaitFor(
            () => this.getMaybeBodyElement(),
            3 * 60 * 1000, //timeout
          )
      )
        .takeUntilBy(this.#stopper)
        .map((bodyElement) => {
          this.#seenBodyElement = bodyElement;
          this.#composeID = this.#element.querySelector<HTMLInputElement>(
            'input[name="composeid"]',
          )!.value;
          this.#messageIDElement = this.#element.querySelector(
            'input[name="draft"]',
          )!;

          if (!this.#messageIDElement) {
            driver
              .getLogger()
              .error(new Error('Could not find compose message id field'));
            // stub so other things don't fail
            this.#messageIDElement = document.createElement('input');
          }

          this.#setupIDs();

          this.#setupStreams();

          this.#setupConsistencyCheckers();

          this.#updateComposeFullscreenState();

          {
            // try and handle the case where the user types in a bad email address
            // we get the presending event but then no other events will pass because
            // a modal comes up informing the user of the bad email address
            this.getEventStream()
              .filter(({ eventName }) => eventName === 'presending')
              .takeUntilBy(this.#stopper)
              .onValue(() => {
                makeElementChildStream(document.body)
                  .map((event) => event.el)
                  .filter(
                    (node) =>
                      node.getAttribute &&
                      node.getAttribute('role') === 'alertdialog',
                  )
                  .takeUntilBy(
                    Kefir.merge([
                      this.getEventStream().filter(
                        ({ eventName }) =>
                          eventName === 'sendCanceled' ||
                          eventName === 'sending',
                      ),
                      Kefir.later(15, undefined),
                    ]),
                  )
                  .onValue(() => {
                    this.#eventStream.emit({
                      eventName: 'sendCanceled',
                    });
                  });
              });
          }
          return this;
        })
        .toProperty(),
    );
    this.ready().onError((errorObject) => {
      driver.getLogger().error(errorObject, {
        hasForm: !!this.getElement().querySelector('form'),
        class: this.getElement().getAttribute('class'),
      });
    });

    Kefir.merge([
      // if we get a presending then we let the other stream wait for
      // sent. But if we get a sendCanceled, then a regular destroy can
      // pass through
      this.#removedFromDOMStopper.filterBy(
        this.#eventStream
          .filter(
            ({ eventName }) =>
              eventName === 'presending' || eventName === 'sendCanceled',
          )
          .map(({ eventName }) => eventName === 'sendCanceled')
          .toProperty(() => true),
      ),
      Kefir.combine([
        this.#removedFromDOMStopper,
        this.#eventStream.filter(({ eventName }) => eventName === 'sent'),
      ]),
    ])
      .take(1) // we delay asap here so that the event stream is not destroyed before listeners here the sent event
      .flatMap(() => delayAsap(null))
      .onValue(() => this.#destroy());

    detectClassicRecipientsArea();
  }

  destroy() {
    // this gets called when the element gets removed from the DOM
    // however we don't want to pass through that destroy event right away
    this.#removedFromDOMStopper.destroy();

    this.#page.dump();
  }

  #destroy() {
    this.#eventStream.emit({
      eventName: 'destroy',
      data: {
        messageID: this.getMessageID(),
        closedByInboxSDK: this.#closedProgrammatically,
      },
    });

    this.#eventStream.end();

    this.#managedViewControllers.forEach((vc) => {
      vc.destroy();
    });

    this.#requestModifiers = {};
    this.#managedViewControllers.length = 0;

    this.#stopper.destroy();

    this.#destroyed = true;
  }

  getStopper() {
    return this.#stopper;
  }

  getEventStream() {
    return this.#eventStream;
  }

  getGmailDriver(): GmailDriver {
    return this.#driver;
  }

  isDestroyed(): boolean {
    return this.#destroyed;
  }

  #getSubjectChangesStream() {
    const subjectElement = this.getSubjectInput();
    return Kefir.fromEvents(subjectElement, 'input').map(() => {
      return {
        eventName: 'subjectChanged' as const,
      };
    });
  }

  #setupStreams() {
    this.#eventStream.plug(getAddressChangesStream(this));

    this.#eventStream.plug(this.#getSubjectChangesStream());
    this.#eventStream.plug(getBodyChangesStream(this));

    this.#eventStream.plug(getResponseTypeChangesStream(this));

    this.#eventStream.plug(
      getPresendingStream({
        element: this.getElement(),
        sendButton: this.getSendButton(),
        sendAndArchive: this.getSendAndArchiveButton(),
      }),
    );

    let discardButton;

    try {
      discardButton = this.getDiscardButton();
    } catch (err) {
      // handle failures of this.getDiscardButton()
      this.#driver
        .getLogger()
        .errorSite(new Error('Failed to find discard button'), {
          html: censorHTMLstring(this.#element.outerHTML),
        });
    }

    if (discardButton) {
      this.#eventStream.plug(
        getDiscardStream({
          element: this.getElement(),
          discardButton,
        }),
      );
    }

    this.#eventStream.plug(
      Kefir.fromEvents(this.getElement(), 'inboxSDKsendCanceled').map(() => ({
        eventName: 'sendCanceled',
      })),
    );

    this.#eventStream.plug(
      Kefir.fromEvents(this.getElement(), 'inboxSDKdiscardCanceled').map(
        () => ({
          eventName: 'discardCanceled',
        }),
      ),
    );

    this.#eventStream.plug(
      Kefir.later(10, undefined)
        .flatMap(() => getMinimizedStream(this))
        .changes()
        .map((minimized) => ({
          eventName: minimized ? 'minimized' : 'restored',
        })),
    );
  }

  #setupConsistencyCheckers() {
    try {
      handleComposeLinkChips(this);
      monitorSelectionRange(this);
      manageButtonGrouping(this);
      sizeFixer(this.#driver, this);
    } catch (err) {
      this.#driver.getLogger().error(err);
    }
  }

  #setupIDs() {
    const syncTargetMessageID = this.#getTargetMessageID();

    if (syncTargetMessageID) {
      this.#driver
        .getGmailMessageIdForSyncMessageId(syncTargetMessageID)
        .then((gmailMessageId) => (this.#targetMessageID = gmailMessageId));
    }

    const syncMessageId = this.#getMessageIDfromForm();

    if (syncMessageId) {
      this.#driver
        .getGmailMessageIdForSyncDraftId(syncMessageId)
        .then((gmailMessageId) => {
          this.#initialMessageId = gmailMessageId;
          this.#messageId = gmailMessageId;
        })
        .catch(() => {
          //do nothing because this means the message hasn't been saved yet
        });

      this.#driver.reportRecentSyncDraftId(syncMessageId);

      this.#stopper.onValue(() => {
        this.#driver.reportDraftClosed(syncMessageId);
      });
    } else {
      this.#driver
        .getLogger()
        .error(new Error('Draft is missing sync draft id'));
    }

    const legacyThreadIdElement =
      this.#element.querySelector<HTMLInputElement>('input[name="lts"]');
    if (
      legacyThreadIdElement &&
      typeof legacyThreadIdElement.value === 'string'
    )
      this.#threadID = legacyThreadIdElement.value;
  }

  #updateComposeFullscreenState() {
    if (this.#isInlineReplyForm) {
      this.#isFullscreen = false;
    } else {
      if (this.#isStandalone) {
        this.#isFullscreen = true;
      } else {
        const fullScreenContainer =
          GmailElementGetter.getFullscreenComposeWindowContainer();

        if (!fullScreenContainer) {
          this.#isFullscreen = false;
        } else {
          this.#isFullscreen = fullScreenContainer.contains(this.#element);
        }
      }
    }
  }

  focus() {
    focus(this);
  }

  insertBodyTextAtCursor(text: string): HTMLElement | null | undefined {
    return this.insertBodyHTMLAtCursor(escape(text).replace(/\n/g, '<br>'));
  }

  insertBodyHTMLAtCursor(html: string): HTMLElement | null | undefined {
    var retVal = insertHTMLatCursor(
      this.getBodyElement(),
      html,
      this.getLastSelectionRange(),
    );

    this.#triggerDraftSave();

    // sometimes the html inserted can be quite large, so we need ot make sure that GMail resizes the compose window
    // triggering an enter press forces Gmail to resize compose
    simulateKey(this.getBodyElement(), 13, 13);
    return retVal;
  }

  insertLinkIntoBody(
    text: string,
    href: string,
  ): HTMLElement | null | undefined {
    var retVal = insertLinkIntoBody(this, text, href);

    this.#triggerDraftSave();

    return retVal;
  }

  insertLinkChipIntoBody(options: {
    iconUrl?: string;
    url: string;
    text: string;
  }): HTMLElement {
    var retVal = insertLinkChipIntoBody(this, options);

    this.#triggerDraftSave();

    return retVal;
  }

  setSubject(text: string) {
    this.#element.querySelector<HTMLInputElement>(
      'input[name=subjectbox]',
    )!.value = text;

    this.#triggerDraftSave();
  }

  setBodyHTML(html: string) {
    this.getBodyElement().innerHTML = html;

    this.#triggerDraftSave();
  }

  setBodyText(text: string) {
    this.getBodyElement().textContent = text;

    this.#triggerDraftSave();
  }

  setToRecipients(emails: string[]) {
    setRecipients(this, 'to', emails);

    this.#triggerDraftSave();
  }

  setCcRecipients(emails: string[]) {
    setRecipients(this, 'cc', emails);

    this.#triggerDraftSave();
  }

  setBccRecipients(emails: string[]) {
    setRecipients(this, 'bcc', emails);

    this.#triggerDraftSave();
  }

  addRecipientRow(
    options: Kefir.Observable<Record<string, any> | null | undefined, unknown>,
  ): () => void {
    return addRecipientRow(this, options);
  }

  forceRecipientRowsOpen(): () => void {
    this.#element.classList.add('inboxsdk__compose_forceRecipientsOpen');

    return () => {
      this.#element.classList.remove('inboxsdk__compose_forceRecipientsOpen');
    };
  }

  hideNativeRecipientRows(): () => void {
    const nativeRecipientRows = getRecipientRowElements(this.#element);
    nativeRecipientRows.forEach((row) => {
      row.classList.add('inboxsdk__compose_forceRecipientRowHidden');
    });
    return () => {
      nativeRecipientRows.forEach((row) => {
        row.classList.remove('inboxsdk__compose_forceRecipientRowHidden');
      });
    };
  }

  hideRecipientArea(): () => void {
    this.#element.classList.add('inboxsdk__compose_hideRecipientArea');

    return () => {
      this.#element.classList.remove('inboxsdk__compose_hideRecipientArea');
    };
  }

  getFromContact() {
    return fromManager.getFromContact(this.#driver, this);
  }

  getFromContactChoices() {
    return fromManager.getFromContactChoices(this.#driver, this);
  }

  setFromEmail(email: string) {
    fromManager.setFromEmail(this.#driver, this, email);
  }

  addButton(
    buttonDescriptor: Kefir.Observable<
      ComposeButtonDescriptor | null | undefined,
      unknown
    >,
    groupOrderHint: string,
    extraOnClickOptions: Record<string, any>,
    bus: Bus<AddedButtonEvents, unknown>,
  ) {
    addButton(this, buttonDescriptor, groupOrderHint, extraOnClickOptions, bus);
  }

  addTooltipToButton(
    buttonViewController: BasicButtonViewController,
    buttonDescriptor: Record<string, any>,
    tooltipDescriptor: TooltipDescriptor,
  ) {
    var tooltip = addTooltipToButton(
      this,
      buttonViewController,
      buttonDescriptor,
      tooltipDescriptor,
    );

    this.#buttonViewControllerTooltipMap.set(buttonViewController, tooltip);
  }

  closeButtonTooltip(buttonViewController: Record<string, any>) {
    if (!this.#buttonViewControllerTooltipMap) {
      return;
    }

    var tooltip =
      this.#buttonViewControllerTooltipMap.get(buttonViewController);

    if (tooltip) {
      tooltip.destroy();

      this.#buttonViewControllerTooltipMap.delete(buttonViewController);
    }
  }

  addComposeNotice(
    options: {
      orderHint?: number;
    } = {},
  ): ComposeNotice {
    const composeNotice = addComposeNotice(this, options);

    this.#element.dispatchEvent(
      new CustomEvent('resize', {
        bubbles: false,
        cancelable: false,
        detail: null,
      }),
    );

    Kefir.fromEvents(composeNotice, 'destroy')
      .flatMap(delayAsap)
      .takeUntilBy(this.#stopper)
      .onValue(() => {
        this.#element.dispatchEvent(
          new CustomEvent('resize', {
            bubbles: false,
            cancelable: false,
            detail: null,
          }),
        );
      });
    return composeNotice;
  }

  addStatusBar(
    options: {
      height?: number;
      orderHint?: number;
      addAboveNativeStatusBar?: boolean;
    } = {},
  ): StatusBar {
    const statusBar = addStatusBar(this, options);

    this.#element.dispatchEvent(
      new CustomEvent('resize', {
        bubbles: false,
        cancelable: false,
        detail: null,
      }),
    );

    Kefir.fromEvents(statusBar, 'destroy')
      .flatMap(delayAsap)
      .takeUntilBy(this.#stopper)
      .onValue(() => {
        this.#element.dispatchEvent(
          new CustomEvent('resize', {
            bubbles: false,
            cancelable: false,
            detail: null,
          }),
        );
      });
    return statusBar;
  }

  hideNativeStatusBar(): () => void {
    const statusArea = this.getStatusArea();
    const nativeStatusBar = querySelector(statusArea, 'table');
    const formattingToolbar = this.getFormattingToolbar();
    const isFormattingToolbarOpen =
      formattingToolbar && formattingToolbar.style.display !== 'none';
    nativeStatusBar.style.display = 'none';

    if (formattingToolbar && isFormattingToolbarOpen) {
      formattingToolbar.style.display = 'none';
    }

    return () => {
      nativeStatusBar.style.display = '';

      if (formattingToolbar && isFormattingToolbarOpen) {
        formattingToolbar.style.display = '';
      }
    };
  }

  replaceSendButton(el: HTMLElement): () => void {
    const sendButton = this.getSendButtonGroup();
    const sendAndArchive = this.getSendAndArchiveButton();
    sendButton.style.display = 'none';
    const sendAndArchiveParent = sendAndArchive && sendAndArchive.parentElement;

    if (sendAndArchiveParent instanceof HTMLElement) {
      sendAndArchiveParent.style.display = 'none';
    }

    const container = document.createElement('div');
    container.classList.add('inboxsdk__compose_customSendContainer');
    container.appendChild(el);
    sendButton.insertAdjacentElement('afterend', container);

    this.#element.setAttribute('data-inboxsdk-send-replaced', '');

    const removalStopper = kefirStopper();
    Kefir.fromEvents<KeyboardEvent, unknown>(this.getBodyElement(), 'keydown')
      .takeUntilBy(this.#stopper)
      .takeUntilBy(removalStopper)
      .filter(
        (domEvent) =>
          (domEvent.which === 9 || domEvent.keyCode === 9) &&
          !domEvent.shiftKey,
      )
      .onValue((domEvent) => {
        // Because of the way the compose DOM is structured, the natural
        // tab order does not flow from the compose body to the status bar.
        // Gmail modifies this flow programatically by focusing the send button,
        // so we have replicate this behavior when the native send button isn't
        // visible.
        const statusArea = this.getStatusArea();
        const focusableEls =
          statusArea.querySelectorAll<HTMLElement>('[tabindex]');
        if (focusableEls.length === 0) return;
        const firstVisibleEl = Array.from(focusableEls).find(
          (el) => el.offsetParent !== null,
        );
        if (!firstVisibleEl) return;
        domEvent.preventDefault();
        domEvent.stopPropagation();
        domEvent.stopImmediatePropagation();
        firstVisibleEl.focus();
      });
    return () => {
      removalStopper.destroy();
      container.remove();

      this.#element.removeAttribute('data-inboxsdk-send-replaced');

      sendButton.style.display = '';

      if (sendAndArchiveParent instanceof HTMLElement) {
        sendAndArchiveParent.style.display = '';
      }
    };
  }

  hideDiscardButton(): () => void {
    const discardBtn = this.getDiscardButton();
    discardBtn.style.display = 'none';
    return () => {
      discardBtn.style.display = '';
    };
  }

  ensureFormattingToolbarIsHidden() {
    const formattingToggleButton = this.getFormattingToolbarToggleButton();
    const formattingToolbar = this.getFormattingToolbar();

    if (
      formattingToggleButton &&
      formattingToolbar &&
      formattingToolbar.style.display === ''
    ) {
      simulateClick(formattingToggleButton);
    }
  }

  close() {
    if (this.isInlineReplyForm()) {
      console.warn("Trying to close an inline reply which doesn't work.");
      return;
    }

    this.#element.dispatchEvent(
      new CustomEvent('closedProgrammatically', {
        bubbles: false,
        cancelable: false,
        detail: null,
      }),
    );

    if (this.#isFullscreen) {
      this.#eventStream
        .filter(({ eventName }) => eventName === 'fullscreenChanged')
        .onValue(() => simulateClick(this.getCloseButton()));

      simulateClick(this.getMoleSwitchButton());
    } else {
      simulateClick(this.getCloseButton());
    }
  }

  send({ sendAndArchive }: { sendAndArchive: boolean }) {
    // asap necessary so if send() is called after presending event.cancel(), the new presending event
    // must happen after the sendCanceled event (which is also delayed by asap).
    asap(() => {
      const sendAndArchiveButton = this.getSendAndArchiveButton();

      if (sendAndArchive && sendAndArchiveButton) {
        simulateClick(sendAndArchiveButton);
      } else {
        simulateClick(this.getSendButton());
      }
    });
  }

  discard() {
    simulateClick(this.getDiscardButton());
  }

  popOut() {
    if (!this.isInlineReplyForm()) {
      throw new Error('Can only pop out inline reply compose views');
    }

    const popOutBtn = querySelector(
      this.#element,
      '.M9 > [role=menu]:first-child > .SK > [role=menuitem]:last-child',
    );
    simulateClick(popOutBtn);
  }

  overrideEditSubject() {
    overrideEditSubject(this.#driver, this);
  }

  #hideDropzones() {
    setCss('compose dropzone hider', 'body > .aC7 .aC9 {visibility: hidden;}');
  }

  #reenableDropzones() {
    setCss('compose dropzone hider', null);
  }

  #dropzonesVisible(): boolean {
    return (
      find(
        document.querySelectorAll('body > .aC7:not(.aWP)'),
        isElementVisible,
      ) != null
    );
  }

  #findDropzoneForThisCompose(inline: boolean): HTMLElement {
    // Iterate through all the dropzones and find the one visually contained by
    // this compose.
    const rect = this.#element.getBoundingClientRect();

    const dropzoneSelector = inline
      ? 'body > .aC7:not(.aWP)'
      : 'body > .aC7.aWP';
    const el = [
      ...document.querySelectorAll<HTMLElement>(dropzoneSelector),
    ].find((dropzone) => {
      if (!isElementVisible(dropzone)) {
        return false;
      }

      const top = parseInt(dropzone.style.top, 10);
      /**
       * Fullscreen compose dropzones have no explicit `Element.prototype.style.height`. `bottom` is NaN because of this.
       */
      const bottom = top + parseInt(dropzone.style.height, 10);
      const left = parseInt(dropzone.style.left, 10);
      const right = left + parseInt(dropzone.style.width, 10);

      return (
        top >= rect.top &&
        left >= rect.left &&
        right <= rect.right &&
        (this.isFullscreen() || bottom <= rect.bottom)
      );
    });
    if (!el) {
      throw new Error('Failed to find dropzone');
    }

    return el;
  }

  async #attachFiles(files: Blob[], inline: boolean): Promise<void> {
    this.#hideDropzones();

    const endDrag = once(() => simulateDragEnd(this.#element, files));

    try {
      let firstLoop = true;

      for (const partitionedFiles of (t.partition as any)(files, 3)) {
        if (firstLoop) {
          firstLoop = false;
        } else {
          await delay(500);
        }

        simulateDragOver(this.#element, partitionedFiles);
        await waitFor(() => this.#dropzonesVisible(), 20 * 1000);

        const dropzone = this.#findDropzoneForThisCompose(inline);

        simulateDrop(dropzone, partitionedFiles);
        endDrag();
        await waitFor(() => !this.#dropzonesVisible(), 20 * 1000);
      }
    } catch (err) {
      this.#driver.getLogger().error(err);
    } finally {
      endDrag();

      this.#reenableDropzones();
    }
  }

  attachFiles(files: Blob[]): Promise<void> {
    return this.#attachFiles(files, false);
  }

  attachInlineFiles(files: Blob[]): Promise<void> {
    return this.#attachFiles(files, true);
  }

  isForward(): boolean {
    return Boolean(this.#element.querySelector('.Un.J-JN-M-I .mI'));
  }

  isReply(): boolean {
    return this.#isInlineReplyForm || !!this.#element.querySelector('.HQ');
  }

  isInlineReplyForm(): boolean {
    return this.#isInlineReplyForm;
  }

  getBodyElement(): HTMLElement {
    const el = this.getMaybeBodyElement();
    if (!el) throw new Error('Could not find body element');
    return el;
  }

  getMaybeBodyElement(): HTMLElement | null | undefined {
    return this.#element.querySelector<HTMLElement>('.Ap [g_editable=true]');
  }

  getTopFormElement(): HTMLElement {
    return querySelector(this.#element, 'td > form');
  }

  getHTMLContent(): string {
    return this.getBodyElement().innerHTML;
  }

  getTextContent(): string {
    return this.getBodyElement().textContent!;
  }

  getSelectedBodyHTML(): string | null | undefined {
    return getSelectedHTMLInElement(
      this.getBodyElement(),
      this.getLastSelectionRange(),
    );
  }

  getSelectedBodyText(): string | null | undefined {
    return getSelectedTextInElement(
      this.getBodyElement(),
      this.getLastSelectionRange(),
    );
  }

  getSubject(): string {
    return this.getSubjectInput().value;
  }

  getSubjectInput(): HTMLInputElement {
    return this.#element.querySelector<HTMLInputElement>(
      'input[name=subjectbox]',
    )!;
  }

  getMetadataFormElement(): HTMLElement {
    const container = this.getBodyElement().closest('.aoP');

    if (!container) {
      throw new Error('Could not find compose container');
    }

    return querySelector(container, 'form.bAs');
  }

  getToRecipients(): Contact[] {
    return getRecipients(this, 'to');
  }

  getCcRecipients(): Contact[] {
    return getRecipients(this, 'cc');
  }

  getBccRecipients(): Contact[] {
    return getRecipients(this, 'bcc');
  }

  getAdditionalActionToolbar(): HTMLElement {
    return require('./gmail-compose-view/get-additional-action-toolbar').default(
      this,
    );
  }

  updateInsertMoreAreaLeft(oldFormattingAreaOffsetLeft: number) {
    updateInsertMoreAreaLeft(this, oldFormattingAreaOffsetLeft);
  }

  /** @internal non-public method used outside this class */
  _getFormattingAreaOffsetLeft(): number {
    return getFormattingAreaOffsetLeft(this);
  }

  getFormattingArea(): HTMLElement | null | undefined {
    let formattingArea = this.#formattingArea;

    if (!formattingArea) {
      formattingArea = this.#formattingArea =
        this.#element.querySelector<HTMLElement>('.oc');
    }

    return formattingArea;
  }

  getFormattingToolbar(): HTMLElement | null | undefined {
    return this.#element.querySelector<HTMLElement>('.aX');
  }

  getFormattingToolbarArrow(): HTMLElement {
    const el = this.getFormattingToolbar();
    if (!el) throw new Error('Failed to find formatting toolbar');
    return querySelector(el, '.aA4');
  }

  getFormattingToolbarToggleButton(): HTMLElement {
    const innerElement = querySelector(this.#element, '[role=button] .dv');
    const btn = closest(innerElement, '[role=button]');
    if (!btn) throw new Error('failed to find button');
    return btn;
  }

  getStatusBarPrependContainer(): HTMLElement | null | undefined {
    return this.#element.querySelector<HTMLElement>(
      '.inboxsdk__compose_statusBarPrependContainer',
    );
  }

  getScrollBody(): HTMLElement {
    var scrollBody = this.#element.querySelector<HTMLElement>('table .GP');

    if (!scrollBody) {
      throw new Error('Failed to find scroll body');
    }

    return scrollBody;
  }

  getStatusArea(): HTMLElement {
    const statusArea =
      this.#element.querySelector<HTMLElement>('.aDg .aDj > .aDh');

    if (!statusArea) throw new Error('Failed to find status area');
    return statusArea;
  }

  getInsertMoreArea(): HTMLElement {
    return querySelector(this.#element, '.eq');
  }

  getInsertLinkButton(): HTMLElement {
    return querySelector(this.#element, '.e5.aaA.aMZ');
  }

  getSendButton(): HTMLElement {
    return querySelector(
      this.#element,
      '.IZ .Up div > div[role=button]:not(.Uo):not([aria-haspopup=true]):not([class^=inboxsdk_])',
    );
  }

  // When schedule send is available, this returns the element that contains both buttons.
  getSendButtonGroup(): HTMLElement {
    const scheduleSend = this.#element.querySelector(
      '.IZ .Up div > [role=button][aria-haspopup=true]:not([class^=inboxsdk_])',
    );

    if (scheduleSend) {
      return scheduleSend.parentElement!;
    }

    return this.getSendButton();
  }

  getSendAndArchiveButton(): HTMLElement | null | undefined {
    if (!this.isReply()) {
      return null;
    }

    const sendAndArchiveButton = this.#element.querySelector<HTMLElement>(
      '.IZ .Up div > div[role=button].Uo:not([aria-haspopup=true]):not([class^=inboxsdk_])',
    );

    if (sendAndArchiveButton) {
      return sendAndArchiveButton;
    }

    // TODO is the rest of this function necessary?
    const sendButton = this.getSendButton();
    const parent = sendButton.parentElement;
    if (!(parent instanceof HTMLElement)) throw new Error('should not happen');

    if (parent.childElementCount <= 1) {
      this.#driver
        .getLogger()
        .eventSdkPassive(
          'getSendAndArchiveButton - old method - failed to find, childElementCount <= 1',
        );

      return null;
    }

    const firstNotSendElement =
      parent.children[0] !== sendButton
        ? parent.children[0]
        : parent.children[1];
    const result = !firstNotSendElement
      ? null
      : firstNotSendElement.querySelector<HTMLElement>('[role=button]');

    if (result) {
      this.#driver
        .getLogger()
        .eventSdkPassive('getSendAndArchiveButton - old method - found');
    } else {
      this.#driver
        .getLogger()
        .eventSdkPassive(
          'getSendAndArchiveButton - old method - failed to find',
        );
    }

    return result;
  }

  getCloseButton(): HTMLElement {
    return this.#element.querySelectorAll<HTMLElement>('.Hm > img')[2];
  }

  getMoleSwitchButton(): HTMLElement {
    return this.#element.querySelectorAll<HTMLElement>('.Hm > img')[1];
  }

  getBottomBarTable(): HTMLElement {
    return querySelector(this.#element, '.aoP .aDh > table');
  }

  getBottomToolbarContainer(): HTMLElement {
    return querySelector(this.#element, '.aoP .aDj');
  }

  getDiscardButton(): HTMLElement {
    return querySelector(this.#element, '.gU .oh');
  }

  getComposeID(): string {
    return this.#composeID;
  }

  getInitialMessageID(): string | null | undefined {
    return this.#initialMessageId;
  }

  /**
   * gets the draft ID
   * from the input that used to hold the hex message ID. Still does not
   * populate until first save.
   */
  #getDraftIDfromForm(): string | null | undefined {
    const value =
      (this.#messageIDElement && this.#messageIDElement.value) || null;

    if (
      typeof value === 'string' &&
      value !== 'undefined' &&
      value !== 'null'
    ) {
      return value.replace('#', '').replace('msg-a:', '');
    }

    return null;
  }

  #getMessageIDfromForm(): string | null | undefined {
    const value =
      (this.#messageIDElement && this.#messageIDElement.value) || null;

    if (
      typeof value === 'string' &&
      value !== 'undefined' &&
      value !== 'null'
    ) {
      return value.replace('#', ''); //annoyingly the hash is included
    }

    return null;
  }

  getMessageID(): string | null | undefined {
    return this.#messageId;
  }

  getTargetMessageID(): string | null | undefined {
    return this.#targetMessageID;
  }

  getThreadID(): string | null | undefined {
    return this.#threadID;
  }

  async getCurrentDraftID(): Promise<string | null | undefined> {
    // This function is mostly a mirror of _getDraftIDimplementation, but
    // instead of waiting when finding out it's not saved, just returns null.
    const draftID = this.#getDraftIDfromForm();

    if (this.#messageId) {
      return draftID;
    } else {
      const syncMessageId = this.#getMessageIDfromForm();

      if (syncMessageId) {
        try {
          // If this succeeds, then the draft must exist on the server and we
          // can safely return the draft id we know.
          await this.#driver.getGmailMessageIdForSyncDraftId(syncMessageId);
        } catch (e) {
          // ignore error, it's probably that the draft isn't saved yet.
          return null;
        }

        return draftID;
      }
    }
  }

  getDraftID(): Promise<string | null | undefined> {
    let draftIDpromise = this.#draftIDpromise;

    if (!draftIDpromise) {
      draftIDpromise = this.#draftIDpromise = this.#getDraftIDimplementation();
    }

    return draftIDpromise;
  }

  async #getDraftIDimplementation(): Promise<string | null | undefined> {
    const draftID = this.#getDraftIDfromForm();

    // we want to keep the semantics that getDraftID doesn't return until
    // the draft is actually saved on Gmail's servers
    if (this.#messageId) {
      // if we have a messageId that means there is a draft on the server
      return draftID;
    } else {
      // there may be a draft on the server, so let's find out
      const syncMessageId = this.#getMessageIDfromForm();

      if (syncMessageId) {
        try {
          // If this succeeds, then the draft must exist on the server and we
          // can safely return the draft id we know.
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const gmailMessageId =
            await this.#driver.getGmailMessageIdForSyncDraftId(syncMessageId);
        } catch (e) {
          // draft doesn't exist so we wait until it does
          await this.#eventStream
            .filter(({ eventName }) => eventName === 'draftSaved')
            .beforeEnd(() => null)
            .map(() => this.#getDraftIDfromForm())
            .take(1)
            .toPromise();
        }

        return draftID;
      }
    }
  }

  addManagedViewController(viewController: { destroy(): void }) {
    this.#managedViewControllers.push(viewController);
  }

  ensureGroupingIsOpen(type: string) {
    ensureGroupingIsOpen(this.#element, type);
  }

  ensureAppButtonToolbarsAreClosed(): void {
    ensureAppButtonToolbarsAreClosed(this.#element);
  }

  isMinimized(): boolean {
    const element = this.getElement();
    const bodyElement = this.getMaybeBodyElement();
    const bodyContainer = find(element.children, (child) =>
      child.contains(bodyElement!),
    ) as HTMLElement | undefined;

    if (!bodyContainer) {
      if (!hasReportedMissingBody) {
        hasReportedMissingBody = true;

        this.#driver
          .getLogger()
          .error(new Error('isMinimized failed to find bodyContainer'), {
            bodyElement: !!bodyElement,
            hasMessageIDElement: !!this.#messageIDElement,
            ended: (this.#eventStream as any).ended,
            bodyElStillInCompose: this.#element.contains(this.#seenBodyElement),
            seenBodyElHtml: censorHTMLstring(this.#seenBodyElement.outerHTML),
            composeHtml: censorHTMLstring(element.outerHTML),
          });
      }

      return false;
    }

    return bodyContainer.style.display !== '';
  }

  setMinimized(minimized: boolean) {
    if (minimized !== this.isMinimized()) {
      if (this.#isInlineReplyForm)
        throw new Error('Not implemented for inline compose views');
      const minimizeButton = querySelector(this.#element, '.Hm > img');
      simulateClick(minimizeButton);
    }
  }

  setFullscreen(fullscreen: boolean) {
    if (fullscreen !== this.isFullscreen()) {
      if (this.#isInlineReplyForm)
        throw new Error('Not implemented for inline compose views');
      const fullscreenButton = querySelector(
        this.#element,
        '.Hm > img:nth-of-type(2)',
      );
      simulateClick(fullscreenButton);
    }
  }

  setTitleBarColor(color: string): () => void {
    const buttonParent = querySelector(
      this.#element,
      '.nH.Hy.aXJ table.cf.Ht td.Hm',
    );
    const elementsToModify = [
      querySelector(this.#element, '.nH.Hy.aXJ .pi > .l.o'),
      querySelector(this.#element, '.nH.Hy.aXJ .l.m'),
      querySelector(this.#element, '.nH.Hy.aXJ .l.m > .l.n'),
    ];
    buttonParent.classList.add('inboxsdk__compose_customTitleBarColor');
    elementsToModify.forEach((el) => {
      el.style.backgroundColor = color;
    });
    return () => {
      buttonParent.classList.remove('inboxsdk__compose_customTitleBarColor');
      elementsToModify.forEach((el) => {
        el.style.backgroundColor = '';
      });
    };
  }

  setTitleBarText(text: string): () => void {
    if (this.isInlineReplyForm()) {
      throw new Error(
        'setTitleBarText() is not supported on inline compose views',
      );
    }

    const titleBarTable = querySelector(
      this.#element,
      '.nH.Hy.aXJ table.cf.Ht',
    );

    if (
      titleBarTable.classList.contains(
        'inboxsdk__compose_hasCustomTitleBarText',
      )
    ) {
      throw new Error(
        'Custom title bar text is already registered for this compose view',
      );
    }

    const titleTextParent = querySelector(
      titleBarTable,
      'div.Hp',
    ).parentElement;

    if (!(titleTextParent instanceof HTMLElement)) {
      throw new Error('Could not locate title bar text parent');
    }

    titleBarTable.classList.add('inboxsdk__compose_hasCustomTitleBarText');
    titleTextParent.classList.add('inboxsdk__compose_nativeTitleBarText');
    const customTitleText = document.createElement('td');
    customTitleText.classList.add('inboxsdk__compose_customTitleBarText');
    customTitleText.innerHTML = autoHtml`
      <div class="Hp">
        <h2 class="a3E">
          <div class="aYF">${text}</div>
        </h2>
      </div>
    `;
    titleTextParent.insertAdjacentElement('afterend', customTitleText);
    return () => {
      customTitleText.remove();
      titleBarTable.classList.remove('inboxsdk__compose_hasCustomTitleBarText');
      titleTextParent.classList.remove('inboxsdk__compose_nativeTitleBarText');
    };
  }

  #triggerDraftSave() {
    if (this.#isTriggeringADraftSavePending) {
      return;
    } else {
      this.#isTriggeringADraftSavePending = true;
      // Done asynchronously with setTimeout because if it's done synchronously
      // or after an asap step after an inline compose view's creation, Gmail
      // interprets the fake keypress and decides to add a '¾' character.
      Kefir.later(0, undefined)
        .takeUntilBy(this.#stopper)
        .onValue(() => {
          this.#isTriggeringADraftSavePending = false;
          const body = this.getMaybeBodyElement();

          if (body) {
            const unsilence = this.#driver
              .getPageCommunicator()
              .silenceGmailErrorsForAMoment();

            try {
              simulateKey(body, 190, 0);
            } finally {
              unsilence();
            }
          }
        });
    }
  }

  // If this compose is a reply, then this gets the message ID of the message
  // we're replying to.
  #getTargetMessageID(): string | null | undefined {
    const input =
      this.#element.querySelector<HTMLInputElement>('input[name="rm"]');
    return input &&
      typeof input.value === 'string' &&
      input.value != 'undefined'
      ? input.value.replace('#', '')
      : null;
  }

  getElement(): HTMLElement {
    return this.#element;
  }

  isFullscreen(): boolean {
    return this.#isFullscreen;
  }

  getLastSelectionRange(): Range | null | undefined {
    // The selection range can become invalid if the compose view has become expanded or
    // minimized since the range was set.
    const range = this.#lastSelectionRange;

    if (
      range &&
      !this.getBodyElement().contains(range.commonAncestorContainer)
    ) {
      this.#lastSelectionRange = undefined;
    }

    return this.#lastSelectionRange;
  }

  setLastSelectionRange(lastSelectionRange: Range | null | undefined) {
    this.#lastSelectionRange = lastSelectionRange;
  }

  registerRequestModifier(
    modifier: (composeParams: { body: string; isPlainText?: boolean }) =>
      | {
          body: string;
          isPlainText?: boolean;
        }
      | Promise<{
          body: string;
          isPlainText?: boolean;
        }>,
  ) {
    const keyId = this.#getDraftIDfromForm();
    if (!keyId) throw new Error('keyId should be set here');

    const modifierId = this.#driver
      .getPageCommunicator()
      .registerComposeRequestModifier(keyId, this.#driver.getAppId());

    this.#requestModifiers[modifierId] = modifier;

    this.#startListeningForModificationRequests();

    this.#stopper.onValue(() => {
      this.#driver
        .getPageCommunicator()
        .unregisterComposeRequestModifier(keyId, modifierId);
    });
  }

  #startListeningForModificationRequests() {
    if (this.#isListeningToAjaxInterceptStream) {
      return;
    }

    const keyId = this.#getDraftIDfromForm();
    if (!keyId) throw new Error('keyId should be set here');

    this.#driver
      .getPageCommunicator()
      .ajaxInterceptStream.filter(
        ({ type, composeid, draftID, modifierId }) =>
          type === 'inboxSDKmodifyComposeRequest' &&
          (composeid === keyId || keyId === draftID) &&
          Boolean(this.#requestModifiers[modifierId]),
      )
      .takeUntilBy(this.#stopper)
      .onValue(
        ({ modifierId, composeParams }: InboxSdkModifyComposeRequest) => {
          if (this.#driver.getLogger().shouldTrackEverything()) {
            this.#driver.getLogger().eventSite('inboxSDKmodifyComposeRequest');
          }

          const modifier = this.#requestModifiers[modifierId];
          const result = new Promise<ReturnType<RequestModifier>>((resolve) =>
            resolve(modifier(composeParams)),
          );
          result
            .then((newComposeParams) =>
              this.#driver
                .getPageCommunicator()
                .modifyComposeRequest(
                  keyId,
                  modifierId,
                  newComposeParams || composeParams,
                ),
            )
            .then((x) => {
              if (this.#driver.getLogger().shouldTrackEverything()) {
                this.#driver.getLogger().eventSite('composeRequestModified');
              }

              return x;
            })
            .catch((err) => {
              this.#driver
                .getPageCommunicator()
                .modifyComposeRequest(keyId, modifierId, composeParams);

              this.#driver.getLogger().error(err);
            });
        },
      );

    this.#isListeningToAjaxInterceptStream = true;
  }

  setupLinkPopOvers(): void {
    if (!this.#hasSetupLinkPopOvers) {
      this.#hasSetupLinkPopOvers = true;

      this.#eventStream.plug(setupLinkPopOvers(this));
    }
  }
}

export type InboxSdkModifyComposeRequest = {
  type: 'inboxSDKmodifyComposeRequest';
  composeid?: string;
  draftID?: string;
  modifierId: string;
  composeParams: {
    body: string;
    isPlainText?: boolean;
  };
};

export default GmailComposeView;
export type ComposeViewDriver = PublicOnly<GmailComposeView>;
