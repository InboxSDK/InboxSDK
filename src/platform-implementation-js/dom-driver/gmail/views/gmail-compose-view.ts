/* eslint-disable @typescript-eslint/no-var-requires */

import autoHtml from 'auto-html';
import t from 'transducers.js';
import once from 'lodash/once';
import escape from 'lodash/escape';
import includes from 'lodash/includes';
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
import * as GmailResponseProcessor from '../gmail-response-processor';
import GmailElementGetter from '../gmail-element-getter';
import setCss from '../../../lib/dom/set-css';
import waitFor from '../../../lib/wait-for';
import streamWaitFor from '../../../lib/stream-wait-for';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
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
import addButton from './gmail-compose-view/add-button';
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
import PageParserTree from 'page-parser-tree';
import { TagTree } from 'tag-tree';
import * as fromManager from './gmail-compose-view/from-manager';
import type {
  ComposeButtonDescriptor,
  ComposeNotice,
  ComposeViewDriver,
  StatusBar,
} from '../../../driver-interfaces/compose-view-driver';
import type GmailDriver from '../gmail-driver';
import { Contact } from '../../../../inboxsdk';
import BasicButtonViewController from '../../../widgets/buttons/basic-button-view-controller';

let hasReportedMissingBody = false;

class GmailComposeView implements ComposeViewDriver {
  _element: HTMLElement;
  _seenBodyElement!: HTMLElement;
  _isInlineReplyForm: boolean;
  _isFullscreen: boolean;
  _isStandalone: boolean;
  _emailWasSent: boolean;
  _driver: GmailDriver;
  _managedViewControllers: Array<{
    destroy(): void;
  }>;
  _eventStream: Bus<any, unknown>;
  _isTriggeringADraftSavePending: boolean;
  _buttonViewControllerTooltipMap: WeakMap<
    Record<string, any>,
    Record<string, any>
  >;
  _composeID!: string;
  _messageIDElement!: HTMLInputElement;
  _messageId: string | null | undefined;
  _finalMessageId: string | null | undefined; // Set only after the message is sent.

  _initialMessageId: string | null | undefined;
  _targetMessageID: string | null | undefined;
  _draftSaving: boolean;
  _draftIDpromise: Promise<string | null | undefined> | null | undefined;
  _threadID: string | null | undefined;
  _stopper: Stopper;
  _lastSelectionRange: Range | null | undefined;
  _requestModifiers: Record<
    string,
    (composeParams: { body: string }) =>
      | {
          body: string;
        }
      | Promise<{
          body: string;
        }>
  >;
  _isListeningToAjaxInterceptStream: boolean;
  _formattingArea: HTMLElement | null | undefined;
  _closedProgrammatically: boolean = false;
  _destroyed: boolean = false;
  _removedFromDOMStopper: Stopper;
  _hasSetupLinkPopOvers: boolean = false;
  _page: PageParserTree;
  tagTree: TagTree<HTMLElement>;
  ready: () => Kefir.Observable<GmailComposeView, unknown>;

  constructor(
    element: HTMLElement,
    xhrInterceptorStream: Kefir.Observable<any, unknown>,
    driver: GmailDriver,
    options: {
      isInlineReplyForm: boolean;
      isStandalone: boolean;
    }
  ) {
    this as ComposeViewDriver;
    this._element = element;

    this._element.classList.add('inboxsdk__compose');

    if (options.isInlineReplyForm) {
      this._element.classList.add('inboxsdk__compose_inlineReply');
    }

    this._isInlineReplyForm = options.isInlineReplyForm;
    this._isStandalone = options.isStandalone;
    this._isFullscreen = false;
    this._emailWasSent = false;
    this._messageId = null;
    this._finalMessageId = null;
    this._draftSaving = false;
    this._draftIDpromise = null;
    this._driver = driver;
    this._stopper = kefirStopper();
    this._managedViewControllers = [];
    this._requestModifiers = {};
    this._isListeningToAjaxInterceptStream = false;
    this._eventStream = kefirBus();
    this._removedFromDOMStopper = kefirStopper();
    this._isTriggeringADraftSavePending = false;
    this._page = makePageParser(element, driver.getLogger());
    this.tagTree = this._page.tree;
    let saveAndSendStream;

    if (this._driver.isUsingSyncAPI()) {
      saveAndSendStream = xhrInterceptorStream // we know _getDraftIDfromForm will work because by the time we're
        // getting an ajax event Gmail's JS has generated an ID and added it to the DOM.
        .filter((event) => event.draftID === this._getDraftIDfromForm())
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
              if (event.oldMessageID) this._messageId = event.oldMessageID;
              if (event.oldThreadID) this._threadID = event.oldThreadID;
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
                      syncThreadID
                    );
                  }),
                  getMessageID: once(async (): Promise<string> => {
                    if (event.oldMessageID) {
                      return event.oldMessageID;
                    }

                    return await driver.getGmailMessageIdForSyncMessageId(
                      syncMessageID
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
              this._messageId = event.oldMessageID;
              this._threadID = event.oldThreadID;
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
        .filter(Boolean);
    } else {
      saveAndSendStream = xhrInterceptorStream
        .filter((event) => event.composeId === this.getComposeID())
        .map((event) => {
          switch (event.type) {
            case 'emailSending': {
              return [
                {
                  eventName: 'sending',
                },
              ];
            }

            case 'emailSent': {
              const response =
                GmailResponseProcessor.interpretSentEmailResponse(
                  event.response
                );

              if (includes(['tr', 'eu'], response.messageID)) {
                return [
                  {
                    eventName: 'sendCanceled',
                  },
                ];
              }

              this._emailWasSent = true;

              if (response.messageID) {
                this._finalMessageId = response.messageID;
              }

              this._messageId = null;
              const data = {
                getThreadID: (): Promise<string> =>
                  Promise.resolve(response.threadID),
                getMessageID: (): Promise<string> =>
                  Promise.resolve(response.messageID),
              };
              ['threadID', 'gmailThreadId'].forEach((prop) => {
                // These properties are nonenumerable.
                Object.defineProperty(data as any, prop, {
                  get: () => {
                    this._driver
                      .getLogger()
                      .deprecationWarning(
                        `composeView sent event.${prop}`,
                        'composeView sent event.getThreadID()'
                      );

                    return response.threadID;
                  },
                });
              });
              ['messageID', 'gmailMessageId'].forEach((prop) => {
                Object.defineProperty(data as any, prop, {
                  get: () => {
                    this._driver
                      .getLogger()
                      .deprecationWarning(
                        `composeView sent event.${prop}`,
                        'composeView sent event.getMessageID()'
                      );

                    return response.messageID;
                  },
                });
              });
              return [
                {
                  eventName: 'sent',
                  data,
                },
              ];
            }

            case 'emailDraftSaveSending': {
              this._draftSaving = true;
              return [
                {
                  eventName: 'draftSaving',
                },
              ];
            }

            case 'emailDraftReceived': {
              this._draftSaving = false;
              let response;

              try {
                response = GmailResponseProcessor.interpretSentEmailResponse(
                  event.response
                );
              } catch (err) {
                if (this._driver.getAppId() === 'sdk_streak_21e9788951') {
                  this._driver.getLogger().error(err, {
                    connectionDetails: event.connectionDetails,
                    response: event.response,
                  });

                  throw err;
                } else {
                  throw err;
                }
              }

              if (response.messageID === 'eu') {
                return []; // save was canceled
              }

              const events = [
                {
                  eventName: 'draftSaved',
                  data: response,
                },
              ];

              if (!response.messageID) {
                this._driver
                  .getLogger()
                  .error(
                    new Error('Missing message id from emailDraftReceived')
                  );
              } else if (
                response.messageID &&
                this._messageId !== response.messageID
              ) {
                if (/^[0-9a-f]+$/i.test(response.messageID)) {
                  this._messageId = response.messageID;
                  events.push({
                    eventName: 'messageIDChange',
                    data: this._messageId as any,
                  });
                } else {
                  this._driver
                    .getLogger()
                    .error(
                      new Error('Invalid message id from emailDraftReceived'),
                      {
                        value: response.messageID,
                      }
                    );
                }
              }

              return events;
            }

            default:
              return [];
          }
        })
        .flatten()
        .map((event) => {
          if (this._driver.getLogger().shouldTrackEverything()) {
            driver.getLogger().eventSite('compose.debug.xhr', {
              eventName: (event as any).eventName,
            });
          }

          return event;
        });
    }

    this._eventStream.plug(
      Kefir.merge<any, any>([
        saveAndSendStream,
        Kefir.fromEvents(this._element, 'buttonAdded').map(() => {
          return {
            eventName: 'buttonAdded',
          };
        }),
        Kefir.fromEvents(this._element, 'resize').map(() => ({
          eventName: 'resize',
        })),
        Kefir.fromEvents(this._element, 'composeFullscreenStateChanged').map(
          () => {
            this._updateComposeFullscreenState();

            return {
              eventName: 'fullscreenChanged',
              data: {
                fullscreen: this._isFullscreen,
              },
            };
          }
        ),
      ])
    );

    Kefir.fromEvents(this._element, 'closedProgrammatically')
      .takeUntilBy(this._stopper)
      .onValue(() => {
        this._closedProgrammatically = true;
      });
    this._buttonViewControllerTooltipMap = new WeakMap();
    const initialBodyElement = this.getMaybeBodyElement();
    this.ready = constant(
      (initialBodyElement
        ? Kefir.constant(initialBodyElement)
        : streamWaitFor(
            () => this.getMaybeBodyElement(),
            3 * 60 * 1000 //timeout
          )
      )
        .takeUntilBy(this._stopper)
        .map((bodyElement) => {
          this._seenBodyElement = bodyElement;
          this._composeID = (
            this._element.querySelector(
              'input[name="composeid"]'
            ) as any as HTMLInputElement
          ).value;
          this._messageIDElement = this._element.querySelector(
            'input[name="draft"]'
          ) as any;

          if (!this._messageIDElement) {
            driver
              .getLogger()
              .error(new Error('Could not find compose message id field'));
            // stub so other things don't fail
            this._messageIDElement = document.createElement('input');
          }

          this._setupIDs();

          this._setupStreams();

          this._setupConsistencyCheckers();

          this._updateComposeFullscreenState();

          {
            // try and handle the case where the user types in a bad email address
            // we get the presending event but then no other events will pass because
            // a modal comes up informing the user of the bad email address
            this.getEventStream()
              .filter(({ eventName }) => eventName === 'presending')
              .takeUntilBy(this._stopper)
              .onValue(() => {
                makeElementChildStream(document.body)
                  .map((event) => event.el)
                  .filter(
                    (node) =>
                      node.getAttribute &&
                      node.getAttribute('role') === 'alertdialog'
                  )
                  .takeUntilBy(
                    Kefir.merge([
                      this.getEventStream().filter(
                        ({ eventName }) =>
                          eventName === 'sendCanceled' ||
                          eventName === 'sending'
                      ),
                      Kefir.later(15, undefined),
                    ])
                  )
                  .onValue(() => {
                    this._eventStream.emit({
                      eventName: 'sendCanceled',
                    });
                  });
              });
          }
          return this;
        })
        .toProperty()
    );
    this.ready().onError((errorObject) => {
      driver.getLogger().error(errorObject, {
        hasForm: !!this.getElement().querySelector('form'),
        class: this.getElement().getAttribute('class'),
      });
    });

    // v2 Data behaves differently whereby the compose element is removed
    // from the page while the send is in flight instead of waiting for the
    // send to come back, so we have to handle that difference
    if (this._driver.isUsingSyncAPI()) {
      Kefir.merge([
        // if we get a presending then we let the other stream wait for
        // sent. But if we get a sendCanceled, then a regular destroy can
        // pass through
        this._removedFromDOMStopper.filterBy(
          this._eventStream
            .filter(
              ({ eventName }) =>
                eventName === 'presending' || eventName === 'sendCanceled'
            )
            .map(({ eventName }) => eventName === 'sendCanceled')
            .toProperty(() => true)
        ),
        Kefir.combine([
          this._removedFromDOMStopper,
          this._eventStream.filter(({ eventName }) => eventName === 'sent'),
        ]),
      ])
        .take(1) // we delay asap here so that the event stream is not destroyed before listeners here the sent event
        .flatMap(() => delayAsap(null))
        .onValue(() => this._destroy());
    } else {
      this._removedFromDOMStopper.onValue(() => this._destroy());
    }

    detectClassicRecipientsArea();
  }

  destroy() {
    // this gets called when the element gets removed from the DOM
    // however we don't want to pass through that destroy event right away
    this._removedFromDOMStopper.destroy();

    this._page.dump();
  }

  _destroy() {
    this._eventStream.emit({
      eventName: 'destroy',
      data: {
        messageID: this.getMessageID(),
        closedByInboxSDK: this._closedProgrammatically,
      },
    });

    this._eventStream.end();

    this._managedViewControllers.forEach((vc) => {
      vc.destroy();
    });

    this._requestModifiers = {};
    this._managedViewControllers.length = 0;

    this._stopper.destroy();

    this._destroyed = true;
  }

  getStopper() {
    return this._stopper;
  }

  getEventStream() {
    return this._eventStream;
  }

  getGmailDriver(): GmailDriver {
    return this._driver;
  }

  isDestroyed(): boolean {
    return this._destroyed;
  }

  _setupStreams() {
    this._eventStream.plug(getAddressChangesStream(this));

    this._eventStream.plug(getBodyChangesStream(this));

    this._eventStream.plug(getResponseTypeChangesStream(this));

    this._eventStream.plug(
      getPresendingStream({
        element: this.getElement(),
        sendButton: this.getSendButton(),
        sendAndArchive: this.getSendAndArchiveButton(),
      })
    );

    let discardButton;

    try {
      discardButton = this.getDiscardButton();
    } catch (err) {
      // handle failures of this.getDiscardButton()
      this._driver
        .getLogger()
        .errorSite(new Error('Failed to find discard button'), {
          html: censorHTMLstring(this._element.outerHTML),
        });
    }

    if (discardButton) {
      this._eventStream.plug(
        getDiscardStream({
          element: this.getElement(),
          discardButton,
        })
      );
    }

    this._eventStream.plug(
      Kefir.fromEvents(this.getElement(), 'inboxSDKsendCanceled').map(() => ({
        eventName: 'sendCanceled',
      }))
    );

    this._eventStream.plug(
      Kefir.fromEvents(this.getElement(), 'inboxSDKdiscardCanceled').map(
        () => ({
          eventName: 'discardCanceled',
        })
      )
    );

    this._eventStream.plug(
      Kefir.later(10, undefined)
        .flatMap(() => getMinimizedStream(this))
        .changes()
        .map((minimized) => ({
          eventName: minimized ? 'minimized' : 'restored',
        }))
    );

    if (!this._driver.isUsingSyncAPI()) {
      makeMutationObserverChunkedStream(this._messageIDElement, {
        attributes: true,
        attributeFilter: ['value'],
      })
        .takeUntilBy(
          this._eventStream.filter(() => false).beforeEnd(() => null)
        )
        .map(() => this._getMessageIDfromForm())
        .filter(
          (messageID) =>
            (messageID as unknown as boolean) &&
            !this._emailWasSent &&
            this._messageId !== messageID
        )
        .onValue((messageID) => {
          this._messageId = messageID;

          this._eventStream.emit({
            eventName: 'messageIDChange',
            data: this._messageId,
          });
        });
    }
  }

  _setupConsistencyCheckers() {
    try {
      handleComposeLinkChips(this);
      monitorSelectionRange(this);
      manageButtonGrouping(this);
      sizeFixer(this._driver, this);
    } catch (err) {
      this._driver.getLogger().error(err);
    }
  }

  _setupIDs() {
    if (this._driver.isUsingSyncAPI()) {
      const syncTargetMessageID = this._getTargetMessageID();

      if (syncTargetMessageID) {
        this._driver
          .getGmailMessageIdForSyncMessageId(syncTargetMessageID)
          .then((gmailMessageId) => (this._targetMessageID = gmailMessageId));
      }

      const syncMessageId = this._getMessageIDfromForm();

      if (syncMessageId) {
        this._driver
          .getGmailMessageIdForSyncDraftId(syncMessageId)
          .then((gmailMessageId) => {
            this._initialMessageId = gmailMessageId;
            this._messageId = gmailMessageId;
          })
          .catch(() => {
            //do nothing because this means the message hasn't been saved yet
          });

        this._driver.reportRecentSyncDraftId(syncMessageId);

        this._stopper.onValue(() => {
          this._driver.reportDraftClosed(syncMessageId);
        });
      } else {
        this._driver
          .getLogger()
          .error(new Error('Draft is missing sync draft id'));
      }

      const legacyThreadIdElement: HTMLInputElement | null | undefined =
        this._element.querySelector('input[name="lts"]') as any;
      if (
        legacyThreadIdElement &&
        typeof legacyThreadIdElement.value === 'string'
      )
        this._threadID = legacyThreadIdElement.value;
    } else {
      this._targetMessageID = this._getTargetMessageID();
      this._messageId = this._initialMessageId = this._getMessageIDfromForm();
      this._threadID = this._getThreadID();
    }
  }

  _updateComposeFullscreenState() {
    if (this._isInlineReplyForm) {
      this._isFullscreen = false;
    } else {
      if (this._isStandalone) {
        this._isFullscreen = true;
      } else {
        const fullScreenContainer =
          GmailElementGetter.getFullscreenComposeWindowContainer();

        if (!fullScreenContainer) {
          this._isFullscreen = false;
        } else {
          this._isFullscreen = fullScreenContainer.contains(this._element);
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
      this.getLastSelectionRange()
    );

    this._triggerDraftSave();

    // sometimes the html inserted can be quite large, so we need ot make sure that GMail resizes the compose window
    // triggering an enter press forces Gmail to resize compose
    simulateKey(this.getBodyElement(), 13, 13);
    return retVal;
  }

  insertLinkIntoBody(
    text: string,
    href: string
  ): HTMLElement | null | undefined {
    var retVal = insertLinkIntoBody(this, text, href);

    this._triggerDraftSave();

    return retVal;
  }

  insertLinkChipIntoBody(options: {
    iconUrl?: string;
    url: string;
    text: string;
  }): HTMLElement {
    var retVal = insertLinkChipIntoBody(this, options);

    this._triggerDraftSave();

    return retVal;
  }

  setSubject(text: string) {
    (this._element.querySelector('input[name=subjectbox]') as any).value = text;

    this._triggerDraftSave();
  }

  setBodyHTML(html: string) {
    this.getBodyElement().innerHTML = html;

    this._triggerDraftSave();
  }

  setBodyText(text: string) {
    this.getBodyElement().textContent = text;

    this._triggerDraftSave();
  }

  setToRecipients(emails: string[]) {
    setRecipients(this, 'to', emails);

    this._triggerDraftSave();
  }

  setCcRecipients(emails: string[]) {
    setRecipients(this, 'cc', emails);

    this._triggerDraftSave();
  }

  setBccRecipients(emails: string[]) {
    setRecipients(this, 'bcc', emails);

    this._triggerDraftSave();
  }

  addRecipientRow(
    options: Kefir.Observable<Record<string, any> | null | undefined, unknown>
  ): () => void {
    return addRecipientRow(this, options);
  }

  forceRecipientRowsOpen(): () => void {
    this._element.classList.add('inboxsdk__compose_forceRecipientsOpen');

    return () => {
      this._element.classList.remove('inboxsdk__compose_forceRecipientsOpen');
    };
  }

  hideNativeRecipientRows(): () => void {
    const nativeRecipientRows = getRecipientRowElements(this._element);
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
    this._element.classList.add('inboxsdk__compose_hideRecipientArea');

    return () => {
      this._element.classList.remove('inboxsdk__compose_hideRecipientArea');
    };
  }

  getFromContact() {
    return fromManager.getFromContact(this._driver, this);
  }

  getFromContactChoices() {
    return fromManager.getFromContactChoices(this._driver, this);
  }

  setFromEmail(email: string) {
    fromManager.setFromEmail(this._driver, this, email);
  }

  addButton(
    buttonDescriptor: Kefir.Observable<
      ComposeButtonDescriptor | null | undefined,
      unknown
    >,
    groupOrderHint: string,
    extraOnClickOptions: Record<string, any>
  ): Promise<Record<string, any> | null | undefined> {
    return addButton(
      this,
      buttonDescriptor,
      groupOrderHint,
      extraOnClickOptions
    );
  }

  addTooltipToButton(
    buttonViewController: BasicButtonViewController,
    buttonDescriptor: Record<string, any>,
    tooltipDescriptor: TooltipDescriptor
  ) {
    var tooltip = addTooltipToButton(
      this,
      buttonViewController,
      buttonDescriptor,
      tooltipDescriptor
    );

    this._buttonViewControllerTooltipMap.set(buttonViewController, tooltip);
  }

  closeButtonTooltip(buttonViewController: Record<string, any>) {
    if (!this._buttonViewControllerTooltipMap) {
      return;
    }

    var tooltip =
      this._buttonViewControllerTooltipMap.get(buttonViewController);

    if (tooltip) {
      tooltip.destroy();

      this._buttonViewControllerTooltipMap.delete(buttonViewController);
    }
  }

  addComposeNotice(
    options: {
      orderHint?: number;
    } = {}
  ): ComposeNotice {
    const composeNotice = addComposeNotice(this, options);

    this._element.dispatchEvent(
      new CustomEvent('resize', {
        bubbles: false,
        cancelable: false,
        detail: null,
      })
    );

    Kefir.fromEvents(composeNotice, 'destroy')
      .flatMap(delayAsap)
      .takeUntilBy(this._stopper)
      .onValue(() => {
        this._element.dispatchEvent(
          new CustomEvent('resize', {
            bubbles: false,
            cancelable: false,
            detail: null,
          })
        );
      });
    return composeNotice;
  }

  addStatusBar(
    options: {
      height?: number;
      orderHint?: number;
      addAboveNativeStatusBar?: boolean;
    } = {}
  ): StatusBar {
    const statusBar = addStatusBar(this, options);

    this._element.dispatchEvent(
      new CustomEvent('resize', {
        bubbles: false,
        cancelable: false,
        detail: null,
      })
    );

    Kefir.fromEvents(statusBar, 'destroy')
      .flatMap(delayAsap)
      .takeUntilBy(this._stopper)
      .onValue(() => {
        this._element.dispatchEvent(
          new CustomEvent('resize', {
            bubbles: false,
            cancelable: false,
            detail: null,
          })
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

    this._element.setAttribute('data-inboxsdk-send-replaced', '');

    const removalStopper = kefirStopper();
    Kefir.fromEvents<KeyboardEvent, unknown>(this.getBodyElement(), 'keydown')
      .takeUntilBy(this._stopper)
      .takeUntilBy(removalStopper)
      .filter(
        (domEvent) =>
          (domEvent.which === 9 || domEvent.keyCode === 9) && !domEvent.shiftKey
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
          (el) => el.offsetParent !== null
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

      this._element.removeAttribute('data-inboxsdk-send-replaced');

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

    this._element.dispatchEvent(
      new CustomEvent('closedProgrammatically', {
        bubbles: false,
        cancelable: false,
        detail: null,
      })
    );

    if (this._isFullscreen) {
      this._eventStream
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
      this._element,
      '.M9 > [role=menu]:first-child > .SK > [role=menuitem]:last-child'
    );
    simulateClick(popOutBtn);
  }

  overrideEditSubject() {
    overrideEditSubject(this._driver, this);
  }

  _hideDropzones() {
    setCss('compose dropzone hider', 'body > .aC7 .aC9 {visibility: hidden;}');
  }

  _reenableDropzones() {
    setCss('compose dropzone hider', null);
  }

  _dropzonesVisible(): boolean {
    return (
      find(
        document.querySelectorAll('body > .aC7:not(.aWP)'),
        isElementVisible
      ) != null
    );
  }

  _findDropzoneForThisCompose(inline: boolean): HTMLElement {
    // Iterate through all the dropzones and find the one visually contained by
    // this compose.
    const rect = this._element.getBoundingClientRect();

    const dropzoneSelector = inline
      ? 'body > .aC7:not(.aWP)'
      : 'body > .aC7.aWP';
    const el: HTMLElement | null | undefined = t.toArray<
      any,
      HTMLElement | null | undefined
    >(
      Array.prototype.slice.call(
        document.querySelectorAll<HTMLElement>(dropzoneSelector)
      ),
      t.compose(
        t.filter(isElementVisible),
        t.filter((dropzone: HTMLElement) => {
          const top = parseInt(dropzone.style.top, 10);
          const bottom = top + parseInt(dropzone.style.height, 10);
          const left = parseInt(dropzone.style.left, 10);
          const right = left + parseInt(dropzone.style.width, 10);
          return (
            top >= rect.top &&
            left >= rect.left &&
            right <= rect.right &&
            bottom <= rect.bottom
          );
        }),
        t.take(1)
      )
    )[0];

    if (!el) {
      throw new Error('Failed to find dropzone');
    }

    return el;
  }

  async _attachFiles(files: Blob[], inline: boolean): Promise<void> {
    this._hideDropzones();

    const endDrag = once(() => simulateDragEnd(this._element, files));

    try {
      let firstLoop = true;

      for (const partitionedFiles of (t.partition as any)(files, 3)) {
        if (firstLoop) {
          firstLoop = false;
        } else {
          await delay(500);
        }

        simulateDragOver(this._element, partitionedFiles);
        await waitFor(() => this._dropzonesVisible(), 20 * 1000);

        const dropzone = this._findDropzoneForThisCompose(inline);

        simulateDrop(dropzone, partitionedFiles);
        endDrag();
        await waitFor(() => !this._dropzonesVisible(), 20 * 1000);
      }
    } catch (err) {
      this._driver.getLogger().error(err);
    } finally {
      endDrag();

      this._reenableDropzones();
    }
  }

  attachFiles(files: Blob[]): Promise<void> {
    return this._attachFiles(files, false);
  }

  attachInlineFiles(files: Blob[]): Promise<void> {
    return this._attachFiles(files, true);
  }

  isForward(): boolean {
    return Boolean(this._element.querySelector('.Un.J-JN-M-I .mI'));
  }

  isReply(): boolean {
    return this._isInlineReplyForm || !!this._element.querySelector('.HQ');
  }

  isInlineReplyForm(): boolean {
    return this._isInlineReplyForm;
  }

  getBodyElement(): HTMLElement {
    const el = this.getMaybeBodyElement();
    if (!el) throw new Error('Could not find body element');
    return el;
  }

  getMaybeBodyElement(): HTMLElement | null | undefined {
    return this._element.querySelector<HTMLElement>('.Ap [g_editable=true]');
  }

  getTopFormElement(): HTMLElement {
    return querySelector(this._element, 'td > form');
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
      this.getLastSelectionRange()
    );
  }

  getSelectedBodyText(): string | null | undefined {
    return getSelectedTextInElement(
      this.getBodyElement(),
      this.getLastSelectionRange()
    );
  }

  getSubject(): string {
    return this.getSubjectInput().value;
  }

  getSubjectInput(): HTMLInputElement {
    return (this._element as any).querySelector('input[name=subjectbox]');
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
      this
    );
  }

  updateInsertMoreAreaLeft(oldFormattingAreaOffsetLeft: number) {
    updateInsertMoreAreaLeft(this, oldFormattingAreaOffsetLeft);
  }

  _getFormattingAreaOffsetLeft(): number {
    return getFormattingAreaOffsetLeft(this);
  }

  getFormattingArea(): HTMLElement | null | undefined {
    let formattingArea = this._formattingArea;

    if (!formattingArea) {
      formattingArea = this._formattingArea =
        this._element.querySelector<HTMLElement>('.oc');
    }

    return formattingArea;
  }

  getFormattingToolbar(): HTMLElement | null | undefined {
    return this._element.querySelector<HTMLElement>('.aX');
  }

  getFormattingToolbarArrow(): HTMLElement {
    const el = this.getFormattingToolbar();
    if (!el) throw new Error('Failed to find formatting toolbar');
    return querySelector(el, '.aA4');
  }

  getFormattingToolbarToggleButton(): HTMLElement {
    const innerElement = querySelector(this._element, '[role=button] .dv');
    const btn = closest(innerElement, '[role=button]');
    if (!btn) throw new Error('failed to find button');
    return btn;
  }

  getStatusBarPrependContainer(): HTMLElement | null | undefined {
    return this._element.querySelector<HTMLElement>(
      '.inboxsdk__compose_statusBarPrependContainer'
    );
  }

  getScrollBody(): HTMLElement {
    var scrollBody = this._element.querySelector<HTMLElement>('table .GP');

    if (!scrollBody) {
      throw new Error('Failed to find scroll body');
    }

    return scrollBody;
  }

  getStatusArea(): HTMLElement {
    const statusArea =
      this._element.querySelector<HTMLElement>('.aDg .aDj > .aDh');

    if (!statusArea) throw new Error('Failed to find status area');
    return statusArea;
  }

  getInsertMoreArea(): HTMLElement {
    return querySelector(this._element, '.eq');
  }

  getInsertLinkButton(): HTMLElement {
    return querySelector(this._element, '.e5.aaA.aMZ');
  }

  getSendButton(): HTMLElement {
    return querySelector(
      this._element,
      '.IZ .Up div > div[role=button]:not(.Uo):not([aria-haspopup=true]):not([class^=inboxsdk_])'
    );
  }

  // When schedule send is available, this returns the element that contains both buttons.
  getSendButtonGroup(): HTMLElement {
    const scheduleSend = this._element.querySelector(
      '.IZ .Up div > [role=button][aria-haspopup=true]:not([class^=inboxsdk_])'
    );

    if (scheduleSend) {
      return (scheduleSend as any).parentElement;
    }

    return this.getSendButton();
  }

  getSendAndArchiveButton(): HTMLElement | null | undefined {
    if (!this.isReply()) {
      return null;
    }

    const sendAndArchiveButton = this._element.querySelector<HTMLElement>(
      '.IZ .Up div > div[role=button].Uo:not([aria-haspopup=true]):not([class^=inboxsdk_])'
    );

    if (sendAndArchiveButton) {
      return sendAndArchiveButton;
    }

    // TODO is the rest of this function necessary?
    const sendButton = this.getSendButton();
    const parent = sendButton.parentElement;
    if (!(parent instanceof HTMLElement)) throw new Error('should not happen');

    if (parent.childElementCount <= 1) {
      this._driver
        .getLogger()
        .eventSdkPassive(
          'getSendAndArchiveButton - old method - failed to find, childElementCount <= 1'
        );

      return null;
    }

    const firstNotSendElement =
      parent.children[0] !== sendButton
        ? parent.children[0]
        : parent.children[1];
    const result = !firstNotSendElement
      ? null
      : firstNotSendElement.querySelector('[role=button]');

    if (result) {
      this._driver
        .getLogger()
        .eventSdkPassive('getSendAndArchiveButton - old method - found');
    } else {
      this._driver
        .getLogger()
        .eventSdkPassive(
          'getSendAndArchiveButton - old method - failed to find'
        );
    }

    return result as HTMLElement | null;
  }

  getCloseButton(): HTMLElement {
    return this._element.querySelectorAll<HTMLElement>('.Hm > img')[2];
  }

  getMoleSwitchButton(): HTMLElement {
    return this._element.querySelectorAll<HTMLElement>('.Hm > img')[1];
  }

  getBottomBarTable(): HTMLElement {
    return querySelector(this._element, '.aoP .aDh > table');
  }

  getBottomToolbarContainer(): HTMLElement {
    return querySelector(this._element, '.aoP .aDj');
  }

  getDiscardButton(): HTMLElement {
    return querySelector(this._element, '.gU .oh');
  }

  getComposeID(): string {
    return this._composeID;
  }

  getInitialMessageID(): string | null | undefined {
    return this._initialMessageId;
  }

  // For use only when isUsingSyncAPI() is true — gets the draft ID
  // from the input that used to hold the hex message ID. Still does not
  // populate until first save.
  _getDraftIDfromForm(): string | null | undefined {
    const value =
      (this._messageIDElement && this._messageIDElement.value) || null;

    if (
      typeof value === 'string' &&
      value !== 'undefined' &&
      value !== 'null'
    ) {
      if (this._driver.isUsingSyncAPI()) {
        return value.replace('#', '').replace('msg-a:', '');
      } else {
        this._driver
          .getLogger()
          .error(new Error('Invalid draft id in element'), {
            value,
          });
      }
    }

    return null;
  }

  _getMessageIDfromForm(): string | null | undefined {
    const value =
      (this._messageIDElement && this._messageIDElement.value) || null;

    if (
      typeof value === 'string' &&
      value !== 'undefined' &&
      value !== 'null'
    ) {
      if (this._driver.isUsingSyncAPI()) {
        return value.replace('#', ''); //annoyingly the hash is included
      } else {
        if (/^[0-9a-f]+$/i.test(value)) {
          return value;
        } else {
          this._driver
            .getLogger()
            .error(new Error('Invalid message id in element'), {
              value,
            });
        }
      }
    }

    return null;
  }

  getMessageID(): string | null | undefined {
    return this._messageId;
  }

  getTargetMessageID(): string | null | undefined {
    return this._targetMessageID;
  }

  getThreadID(): string | null | undefined {
    return this._threadID;
  }

  async getCurrentDraftID(): Promise<string | null | undefined> {
    if (this._driver.isUsingSyncAPI()) {
      // This function is mostly a mirror of _getDraftIDimplementation, but
      // instead of waiting when finding out it's not saved, just returns null.
      const draftID = this._getDraftIDfromForm();

      if (this._messageId) {
        return draftID;
      } else {
        const syncMessageId = this._getMessageIDfromForm();

        if (syncMessageId) {
          try {
            // If this succeeds, then the draft must exist on the server and we
            // can safely return the draft id we know.
            await this._driver.getGmailMessageIdForSyncDraftId(syncMessageId);
          } catch (e) {
            // ignore error, it's probably that the draft isn't saved yet.
            return null;
          }

          return draftID;
        }
      }
    } else {
      if (!this.getMessageID()) {
        return null;
      } else {
        return this.getDraftID();
      }
    }
  }

  getDraftID(): Promise<string | null | undefined> {
    let draftIDpromise = this._draftIDpromise;

    if (!draftIDpromise) {
      draftIDpromise = this._draftIDpromise = this._getDraftIDimplementation();
    }

    return draftIDpromise;
  }

  async _getDraftIDimplementation(): Promise<string | null | undefined> {
    if (this._driver.isUsingSyncAPI()) {
      const draftID = this._getDraftIDfromForm();

      // we want to keep the semantics that getDraftID doesn't return until
      // the draft is actually saved on Gmail's servers
      if (this._messageId) {
        // if we have a messageId that means there is a draft on the server
        return draftID;
      } else {
        // there may be a draft on the server, so let's find out
        const syncMessageId = this._getMessageIDfromForm();

        if (syncMessageId) {
          try {
            // If this succeeds, then the draft must exist on the server and we
            // can safely return the draft id we know.
            const gmailMessageId =
              await this._driver.getGmailMessageIdForSyncDraftId(syncMessageId);
          } catch (e) {
            // draft doesn't exist so we wait until it does
            await this._eventStream
              .filter(({ eventName }) => eventName === 'draftSaved')
              .beforeEnd(() => null)
              .map(() => this._getDraftIDfromForm())
              .take(1)
              .toPromise();
          }

          return draftID;
        }
      }
    } else {
      let i = -1;
      let lastDebugData = null;

      try {
        // If this compose view doesn't have a message id yet, wait until it gets
        // one or it's closed.
        if (!this._messageId) {
          await this._eventStream
            .filter((event) => event.eventName === 'messageIDChange')
            .beforeEnd(() => null)
            .take(1)
            .toPromise();

          if (!this._messageId) {
            // The compose was closed before it got an id.
            return null;
          }
        }

        // We make an AJAX request against gmail to find the draft ID for our
        // current message ID. However, our message ID can change before that
        // request finishes. If we fail to get our draft ID and we see that our
        // message ID has changed since we made the request, then we try again.
        let lastMessageId = null;

        // eslint-disable-next-line no-constant-condition
        while (true) {
          i++;
          const messageId = this._messageId;

          if (!messageId) {
            throw new Error('Should not happen');
          }

          if (lastMessageId === messageId) {
            // It's possible that the server received a draft save request from us
            // already, causing the draft id lookup to fail, but we haven't gotten
            // the draft save response yet. Wait for that response to finish and
            // keep trying if it looks like that might be the case.
            if (this._draftSaving) {
              await this._eventStream
                .filter((event) => event.eventName === 'messageIDChange')
                .beforeEnd(() => null)
                .take(1)
                .toPromise();
              continue;
            }

            // maaaaybe the draft is saving, but we failed to detect that.
            // Let's log whether things would've worked out a little in the future.
            setTimeout(async () => {
              const newMessageId = this._messageId;

              if (!newMessageId) {
                throw new Error('Should not happen');
              }

              const { draftID, debugData } =
                await this._driver.getDraftIDForMessageID(newMessageId, true);
              const err = new Error('Failed to read draft ID -- after check');

              this._driver.getLogger().error(err, {
                message: 'getDraftID error -- after check',
                messageIdChanged: messageId !== newMessageId,
                gotDraftID: draftID != null,
                debugData: draftID ? null : debugData,
              });
            }, 10 * 1000);
            throw new Error('Failed to read draft ID');
          }

          lastMessageId = messageId;
          const { draftID, debugData } =
            await this._driver.getDraftIDForMessageID(messageId);
          lastDebugData = debugData;

          if (draftID) {
            return draftID;
          }
        }
      } catch (err) {
        this._driver.getLogger().error(err, {
          message: 'getDraftID error',
          removedFromDOM: !document.contains(this._element),
          destroyed: this._destroyed,
          isFullscreen: this._isFullscreen,
          isStandalone: this._isStandalone,
          emailWasSent: this._emailWasSent,
          i,
          lastDebugData,
        });

        throw err;
      }
    }
  }

  addManagedViewController(viewController: { destroy(): void }) {
    this._managedViewControllers.push(viewController);
  }

  ensureGroupingIsOpen(type: string) {
    ensureGroupingIsOpen(this._element, type);
  }

  ensureAppButtonToolbarsAreClosed(): void {
    ensureAppButtonToolbarsAreClosed(this._element);
  }

  isMinimized(): boolean {
    const element = this.getElement();
    const bodyElement = this.getMaybeBodyElement();
    const bodyContainer = find(element.children, (child) =>
      child.contains(bodyElement!)
    ) as HTMLElement | undefined;

    if (!bodyContainer) {
      if (!hasReportedMissingBody) {
        hasReportedMissingBody = true;

        this._driver
          .getLogger()
          .error(new Error('isMinimized failed to find bodyContainer'), {
            bodyElement: !!bodyElement,
            hasMessageIDElement: !!this._messageIDElement,
            ended: (this._eventStream as any).ended,
            bodyElStillInCompose: this._element.contains(this._seenBodyElement),
            seenBodyElHtml: censorHTMLstring(this._seenBodyElement.outerHTML),
            composeHtml: censorHTMLstring(element.outerHTML),
          });
      }

      return false;
    }

    return bodyContainer.style.display !== '';
  }

  setMinimized(minimized: boolean) {
    if (minimized !== this.isMinimized()) {
      if (this._isInlineReplyForm)
        throw new Error('Not implemented for inline compose views');
      const minimizeButton = querySelector(this._element, '.Hm > img');
      simulateClick(minimizeButton);
    }
  }

  setFullscreen(fullscreen: boolean) {
    if (fullscreen !== this.isFullscreen()) {
      if (this._isInlineReplyForm)
        throw new Error('Not implemented for inline compose views');
      const fullscreenButton = querySelector(
        this._element,
        '.Hm > img:nth-of-type(2)'
      );
      simulateClick(fullscreenButton);
    }
  }

  setTitleBarColor(color: string): () => void {
    const buttonParent = querySelector(
      this._element,
      '.nH.Hy.aXJ table.cf.Ht td.Hm'
    );
    const elementsToModify = [
      querySelector(this._element, '.nH.Hy.aXJ .pi > .l.o'),
      querySelector(this._element, '.nH.Hy.aXJ .l.m'),
      querySelector(this._element, '.nH.Hy.aXJ .l.m > .l.n'),
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
        'setTitleBarText() is not supported on inline compose views'
      );
    }

    const titleBarTable = querySelector(
      this._element,
      '.nH.Hy.aXJ table.cf.Ht'
    );

    if (
      titleBarTable.classList.contains(
        'inboxsdk__compose_hasCustomTitleBarText'
      )
    ) {
      throw new Error(
        'Custom title bar text is already registered for this compose view'
      );
    }

    const titleTextParent = querySelector(
      titleBarTable,
      'div.Hp'
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

  _triggerDraftSave() {
    if (this._isTriggeringADraftSavePending) {
      return;
    } else {
      this._isTriggeringADraftSavePending = true;
      // Done asynchronously with setTimeout because if it's done synchronously
      // or after an asap step after an inline compose view's creation, Gmail
      // interprets the fake keypress and decides to add a '¾' character.
      Kefir.later(0, undefined)
        .takeUntilBy(this._stopper)
        .onValue(() => {
          this._isTriggeringADraftSavePending = false;
          const body = this.getMaybeBodyElement();

          if (body) {
            const unsilence = this._driver
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
  _getTargetMessageID(): string | null | undefined {
    const input: HTMLInputElement | null | undefined =
      this._element.querySelector('input[name="rm"]') as any;
    return input &&
      typeof input.value === 'string' &&
      input.value != 'undefined'
      ? input.value.replace('#', '')
      : null;
  }

  _getThreadID(): string | null | undefined {
    const targetID = this.getTargetMessageID();

    try {
      return targetID ? this._driver.getThreadIDForMessageID(targetID) : null;
    } catch (err) {
      this._driver.getLogger().error(err);

      return null;
    }
  }

  getElement(): HTMLElement {
    return this._element;
  }

  isFullscreen(): boolean {
    return this._isFullscreen;
  }

  getLastSelectionRange(): Range | null | undefined {
    // The selection range can become invalid if the compose view has become expanded or
    // minimized since the range was set.
    const range = this._lastSelectionRange;

    if (
      range &&
      !this.getBodyElement().contains(range.commonAncestorContainer)
    ) {
      this._lastSelectionRange = undefined;
    }

    return this._lastSelectionRange;
  }

  setLastSelectionRange(lastSelectionRange: Range | null | undefined) {
    this._lastSelectionRange = lastSelectionRange;
  }

  registerRequestModifier(
    modifier: (composeParams: { body: string }) =>
      | {
          body: string;
        }
      | Promise<{
          body: string;
        }>
  ) {
    const keyId = this._driver.isUsingSyncAPI()
      ? this._getDraftIDfromForm()
      : this.getComposeID();
    if (!keyId) throw new Error('keyId should be set here');

    const modifierId = this._driver
      .getPageCommunicator()
      .registerComposeRequestModifier(keyId, this._driver.getAppId());

    this._requestModifiers[modifierId] = modifier;

    this._startListeningForModificationRequests();

    this._stopper.onValue(() => {
      this._driver
        .getPageCommunicator()
        .unregisterComposeRequestModifier(keyId, modifierId);
    });
  }

  _startListeningForModificationRequests() {
    if (this._isListeningToAjaxInterceptStream) {
      return;
    }

    const keyId = this._driver.isUsingSyncAPI()
      ? this._getDraftIDfromForm()
      : this.getComposeID();
    if (!keyId) throw new Error('keyId should be set here');

    this._driver
      .getPageCommunicator()
      .ajaxInterceptStream.filter(
        ({ type, composeid, draftID, modifierId }) =>
          type === 'inboxSDKmodifyComposeRequest' &&
          (composeid === keyId || keyId === draftID) &&
          Boolean(this._requestModifiers[modifierId])
      )
      .takeUntilBy(this._stopper)
      .onValue(({ modifierId, composeParams }) => {
        if (this._driver.getLogger().shouldTrackEverything()) {
          this._driver.getLogger().eventSite('inboxSDKmodifyComposeRequest');
        }

        const modifier = this._requestModifiers[modifierId];
        const result = new Promise((resolve) =>
          resolve(modifier(composeParams))
        );
        result
          .then((newComposeParams) =>
            this._driver
              .getPageCommunicator()
              .modifyComposeRequest(
                keyId,
                modifierId,
                newComposeParams || composeParams
              )
          )
          .then((x) => {
            if (this._driver.getLogger().shouldTrackEverything()) {
              this._driver.getLogger().eventSite('composeRequestModified');
            }

            return x;
          })
          .catch((err) => {
            this._driver
              .getPageCommunicator()
              .modifyComposeRequest(keyId, modifierId, composeParams);

            this._driver.getLogger().error(err);
          });
      });

    this._isListeningToAjaxInterceptStream = true;
  }

  setupLinkPopOvers(): void {
    if (!this._hasSetupLinkPopOvers) {
      this._hasSetupLinkPopOvers = true;

      this._eventStream.plug(setupLinkPopOvers(this));
    }
  }
}

export default GmailComposeView;
