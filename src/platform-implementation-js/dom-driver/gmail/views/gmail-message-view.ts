import sortBy from 'lodash/sortBy';
import once from 'lodash/once';
import autoHtml from 'auto-html';
import * as Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type { Bus } from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import kefirCast from 'kefir-cast';
import GmailAttachmentAreaView from './gmail-attachment-area-view';
import GmailAttachmentCardView from './gmail-attachment-card-view';
import getUpdatedContact from './gmail-message-view/get-updated-contact';
import AttachmentIcon from './gmail-message-view/attachment-icon';
import makeMutationObserverStream from '../../../lib/dom/make-mutation-observer-stream';
import querySelector from '../../../lib/dom/querySelectorOrFail';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
import type { ElementWithLifetime } from '../../../lib/dom/make-element-child-stream';
import { simulateClick } from '../../../lib/dom/simulate-mouse-event';
import censorHTMLtree from '../../../../common/censorHTMLtree';
import findParent from '../../../../common/find-parent';
import reemitClickEvent from '../../../lib/dom/reemitClickEventForReact';
import type GmailDriver from '../gmail-driver';
import type GmailThreadView from './gmail-thread-view';
import type {
  Contact,
  MessageAttachmentIconDescriptor,
  MessageView,
  ThreadView,
} from '../../../../inboxsdk';
import type { VIEW_STATE } from '../../../views/conversations/message-view';

let hasSeenOldElement = false;

export type MessageViewDriverEventByName = {
  viewStateChange: {
    eventName: 'viewStateChange';
    newValue?: VIEW_STATE;
    oldValue?: VIEW_STATE;
  };
  contactHover: {
    eventName: 'contactHover';
    contact: Contact;
    contactType: string;
    messageView: MessageView;
    threadView: ThreadView;
    internal?: undefined;
  };
  replyElement: {
    change: ElementWithLifetime;
    eventName: 'replyElement';
    type: 'internal';
  };
};

export type MessageViewDriverEvents = (
  | MessageViewDriverEventByName['viewStateChange']
  | MessageViewDriverEventByName['contactHover']
  | MessageViewDriverEventByName['replyElement']
  | {
      eventName: 'load' | 'destroy';
    }
  | {
      eventName: 'messageLoad';
    }
) & {
  type?: 'internal';
};

class GmailMessageView {
  #element: HTMLElement;
  #driver!: GmailDriver;
  #eventStream: Bus<MessageViewDriverEvents, unknown> = kefirBus();
  #stopper = kefirStopper();
  #threadViewDriver: GmailThreadView;
  #moreMenuItemDescriptors: Array<Record<string, any>>;
  #moreMenuAddedElements: Array<HTMLElement>;
  #replyElementStream: Kefir.Observable<ElementWithLifetime, unknown>;
  #readyStream: Kefir.Observable<null, unknown>;
  #replyElement: HTMLElement | null | undefined;
  #gmailAttachmentAreaView: GmailAttachmentAreaView | null | undefined;
  #messageLoaded: boolean = false;
  #openMoreMenu: HTMLElement | null | undefined;
  #sender: Contact | null | undefined = null;
  #recipients: Contact[] | null | undefined = null;
  #recipientEmailAddresses: string[] | null | undefined = null;
  #recipientsFull: Contact[] | null | undefined = null;

  constructor(
    element: HTMLElement,
    gmailThreadView: GmailThreadView,
    driver: GmailDriver,
  ) {
    this.#element = element;
    this.#threadViewDriver = gmailThreadView;
    this.#driver = driver;
    this.#moreMenuItemDescriptors = [];
    this.#moreMenuAddedElements = [];
    this.#replyElement = null;
    // Outputs the same type of stream as makeElementChildStream does.
    this.#replyElementStream = this.#eventStream
      .filter(
        function (
          event,
        ): event is MessageViewDriverEventByName['replyElement'] {
          return event.eventName === 'replyElement';
        },
      )
      .map((event) => event.change);

    this.#setupMessageStateStream();

    this.#monitorEmailAddressHovering();

    this.#setupMoreMenuWatching();

    let partialReadyStream;

    // handle the case that the data-message-id is available, but the data-legacy-message-id is not
    // this happens when you're looking at a thread, and then you reply to a message, the message id is generated
    // client side, so the new message added (from your reply) shows up in the UI right away and has a data-message-id but
    // because it hasn't been synced to the server it does not have a data-legacy-messag-id
    // so we wait until the message has been synced to the server before saying this is ready
    const messageIdElement = this.#element.querySelector('[data-message-id]');

    if (messageIdElement) {
      const syncMessageId = messageIdElement.getAttribute('data-message-id');
      if (!syncMessageId)
        throw new Error('data-message-id attribute has no value');

      // Only respect data-legacy-message-id if data-message-id is not the id
      // of a draft we've seen recently, in order to work around a Gmail bug.
      // https://github.com/StreakYC/GmailSDK/issues/515#issuecomment-457420619
      if (
        messageIdElement.hasAttribute('data-legacy-message-id') &&
        !this.#driver.isRecentSyncDraftId(syncMessageId.replace('#', ''))
      ) {
        partialReadyStream = Kefir.constant(null);
      } else {
        // we have a data message id, but not the legacy message id. So now we have to poll for the gmail message id
        partialReadyStream = Kefir.fromPromise(
          (async () => {
            for (let ii = 0; ii < 10; ii++) {
              try {
                const gmailMessageId =
                  await this.#driver.getGmailMessageIdForSyncMessageId(
                    syncMessageId.replace('#', ''),
                  );
                // set the legacy message id attribute so subsequent calls to getMessageId find the legacy message id in the dom
                messageIdElement.setAttribute(
                  'data-legacy-message-id',
                  gmailMessageId,
                );
                return null;
              } catch (e) {
                await new Promise((resolve) => setTimeout(resolve, ii * 200));
              }
            }

            throw new Error('gmail message id never became available');
          })(),
        );
      }
    } else {
      partialReadyStream = Kefir.constant(null);
    }

    this.#readyStream = partialReadyStream
      .takeUntilBy(this.#stopper)
      .onValue(() => this.#processInitialState());
  }

  destroy() {
    this.#stopper.destroy();

    this.#eventStream.end();

    if (this.#gmailAttachmentAreaView) this.#gmailAttachmentAreaView.destroy();

    this.#moreMenuAddedElements.forEach((el) => {
      el.remove();
    });
  }

  getEventStream() {
    return this.#eventStream;
  }

  getReplyElementStream() {
    return this.#replyElementStream;
  }

  getElement(): HTMLElement {
    return this.#element;
  }

  getThreadViewDriver(): GmailThreadView {
    return this.#threadViewDriver;
  }

  isLoaded(): boolean {
    return this.#messageLoaded;
  }

  getContentsElement(): HTMLElement {
    if (!this.#messageLoaded) {
      throw new Error('tried to get message contents before message is loaded');
    }

    try {
      return querySelector(this.#element, 'div.ii.gt');
    } catch (err) {
      // Keep old fallback selector until we're confident of the new one.
      this.#driver.getLogger().error(err);

      return querySelector(this.#element, '.adP');
    }
  }

  isElementInQuotedArea(element: HTMLElement): boolean {
    return findParent(element, (el) => el.nodeName === 'BLOCKQUOTE') != null;
  }

  getSender(): Contact {
    let sender = this.#sender;
    if (sender) return sender;
    const senderSpan = querySelector(this.#element, 'td.gF span[email]');
    const emailAddress = senderSpan.getAttribute('email');
    if (!emailAddress) throw new Error('Could not find email address');
    sender = this.#sender = {
      name: senderSpan.getAttribute('name')!,
      emailAddress,
    };
    return sender;
  }

  getRecipients(): Array<Contact> {
    let recipients = this.#recipients;
    if (recipients) return recipients;
    const receipientSpans = Array.from(
      this.#element.querySelectorAll('.hb span[email]'),
    );
    recipients = this.#recipients = receipientSpans.map((span) => {
      return this.#getUpdatedContact({
        name: span.getAttribute('name')!,
        emailAddress: span.getAttribute('email') || '',
      });
    });
    return recipients;
  }

  getRecipientEmailAddresses(): Array<string> {
    let recipients = this.#recipientEmailAddresses;
    if (recipients) return recipients;
    const receipientSpans = Array.from(
      this.#element.querySelectorAll('.hb span[email]'),
    );
    recipients = this.#recipientEmailAddresses = receipientSpans.map(
      (span) => span.getAttribute('email') || '',
    );
    return recipients;
  }

  async getRecipientsFull(): Promise<Array<Contact>> {
    let recipients = this.#recipientsFull;
    if (recipients) return recipients;

    const threadID = this.#threadViewDriver.getInternalID();

    recipients = this.#recipientsFull = (await this.#driver
      .getPageCommunicator()
      .getMessageRecipients(threadID, this.#element)) as any;

    if (!recipients) {
      this.#driver
        .getLogger()
        .error(new Error('Failed to find message recipients from response'), {
          threadID,
        });

      recipients = this.#recipientsFull = this.getRecipients();
    }

    return recipients;
  }

  getDateString(): string {
    return querySelector(this.#element, '.ads .gK .g3').title;
  }

  async getDate(): Promise<number | null | undefined> {
    const threadID = this.#threadViewDriver.getInternalID();

    return await this.#driver
      .getPageCommunicator()
      .getMessageDate(threadID, this.#element);
  }

  getAttachmentCardViewDrivers() {
    if (!this.#gmailAttachmentAreaView) {
      return [];
    }

    return this.#gmailAttachmentAreaView.getAttachmentCardViews();
  }

  addButtonToDownloadAllArea(options: Record<string, any>) {
    var gmailAttachmentAreaView = this.#getAttachmentArea();

    if (!gmailAttachmentAreaView) {
      return;
    }

    gmailAttachmentAreaView.addButtonToDownloadAllArea(options);
  }

  addMoreMenuItem(options: Record<string, any>) {
    this.#moreMenuItemDescriptors = sortBy(
      this.#moreMenuItemDescriptors.concat([options]),
      (o) => o.orderHint,
    );

    this.#updateMoreMenu();
  }

  #setupMoreMenuWatching() {
    // At the start, and whenever the view state changes, watch the
    // 'aria-expanded' property of the more button, and when that changes,
    // update the _openMoreMenu property.
    this.#openMoreMenu = null;

    this.#eventStream
      .filter((e) => e.eventName === 'viewStateChange')
      .toProperty(() => null)
      .flatMapLatest(() => {
        const moreButton = this.#getMoreButton();

        if (!moreButton) {
          return Kefir.constant(null);
        }

        return makeMutationObserverChunkedStream(moreButton, {
          attributes: true,
          attributeFilter: ['aria-expanded'],
        }).map(() =>
          moreButton.getAttribute('aria-expanded') === 'true'
            ? this.#getOpenMoreMenu()
            : null,
        );
      })
      .takeUntilBy(this.#stopper)
      .onValue((openMoreMenu) => {
        this.#openMoreMenu = openMoreMenu;

        this.#updateMoreMenu();
      });
  }

  #getMoreButton(): HTMLElement | null | undefined {
    if (this.getViewState() !== 'EXPANDED') {
      return null;
    }

    return this.#element.querySelector<HTMLElement>(
      'tr.acZ div.T-I.J-J5-Ji.aap.L3[role=button][aria-haspopup]',
    );
  }

  #getOpenMoreMenu(): HTMLElement | null | undefined {
    const selector_2022_11_23 =
      'td > div.nH.a98.iY > div.nH .aHU .b7.J-M[aria-haspopup=true]';
    const selector_2023_11_16 =
      'div.nH.a98.iY > div.nH .aHU .b7.J-M[aria-haspopup=true]';

    const maybeMoreMenu =
      document.body.querySelector<HTMLElement>(selector_2023_11_16) ||
      document.body.querySelector<HTMLElement>(selector_2022_11_23);
    // This will find any message's open more menu! The caller needs to make
    // sure it belongs to this message!
    return (
      maybeMoreMenu ||
      document.body.querySelector<HTMLElement>(
        'td > div.nH.if > div.nH.aHU div.b7.J-M[aria-haspopup=true]',
      )
    );
  }

  #closeActiveEmailMenu() {
    const moreButton = this.#getMoreButton();

    if (moreButton) {
      simulateClick(moreButton);
    }
  }

  #updateMoreMenu() {
    this.#moreMenuAddedElements.forEach((el) => {
      el.remove();
    });

    this.#moreMenuAddedElements.length = 0;
    const openMoreMenu = this.#openMoreMenu;

    if (openMoreMenu && this.#moreMenuItemDescriptors.length) {
      const originalHeight = openMoreMenu.offsetHeight;
      const originalWidth = openMoreMenu.offsetWidth;
      const dividerEl = document.createElement('div');
      dividerEl.className = 'J-Kh';

      this.#moreMenuAddedElements.push(dividerEl);

      openMoreMenu.appendChild(dividerEl);

      this.#moreMenuItemDescriptors.forEach((options) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'J-N';
        itemEl.setAttribute('role', 'menuitem');
        itemEl.innerHTML = autoHtml`<div class="J-N-Jz">${options.title}</div>`;
        itemEl.addEventListener('mouseenter', () =>
          itemEl.classList.add('J-N-JT'),
        );
        itemEl.addEventListener('mouseleave', () =>
          itemEl.classList.remove('J-N-JT'),
        );
        itemEl.addEventListener('click', () => {
          this.#closeActiveEmailMenu();

          options.onClick();
        });

        if (options.iconUrl || options.iconClass) {
          const iconEl = document.createElement('img');
          iconEl.className = `f4 J-N-JX inboxsdk__message_more_icon ${
            options.iconClass || ''
          }`;
          iconEl.src = options.iconUrl || 'images/cleardot.gif';
          const insertionPoint = itemEl.firstElementChild;
          if (insertionPoint) insertionPoint.appendChild(iconEl);
        }

        this.#moreMenuAddedElements.push(itemEl);

        openMoreMenu.appendChild(itemEl);
      });

      const menuRect = openMoreMenu.getBoundingClientRect();
      const addedWidth = menuRect.width - originalWidth;

      if (addedWidth > 0) {
        openMoreMenu.style.left =
          Math.max(0, parseInt(openMoreMenu.style.left) - addedWidth) + 'px';
      }

      const moreButton = this.#getMoreButton();

      if (moreButton) {
        const moreButtonRect = moreButton.getBoundingClientRect();

        // If the menu is positioned above the button, then adjust the menu
        // upwards to compensate for the buttons we added.
        if (menuRect.top < moreButtonRect.top) {
          const addedHeight = menuRect.height - originalHeight;
          openMoreMenu.style.top =
            Math.max(0, parseInt(openMoreMenu.style.top) - addedHeight) + 'px';
        }
      }
    }
  }

  getMessageID(ignoreLoadStatus: boolean = false): string {
    if (!ignoreLoadStatus && !this.#messageLoaded) {
      throw new Error('tried to get message id before message is loaded');
    }

    const messageIdElement = this.#element.querySelector(
      '[data-legacy-message-id]',
    );

    if (messageIdElement) {
      const messageId = messageIdElement.getAttribute('data-legacy-message-id');
      if (!messageId)
        throw new Error('message id attribute with no value, wtf?');
      return messageId;
    }

    const messageEl = this.#element.querySelector<HTMLElement>('div.ii.gt');

    if (!messageEl) {
      const err = new Error('Could not find message id element');

      this.#driver.getLogger().error(err, {
        elementHtml: censorHTMLtree(this.#element),
      });

      throw err;
    }

    const m = messageEl.className.match(/\bm([0-9a-f]+)\b/);
    if (m) {
      if (!hasSeenOldElement) {
        hasSeenOldElement = true;

        this.#driver.getLogger().eventSite('old messageid location');
      }

      return m[1];
    } else {
      const messageElChild = messageEl.firstElementChild;

      if (!messageElChild) {
        const err = new Error('Could not find message id value');

        this.#driver.getLogger().error(err, {
          reason: 'Could not find element',
          messageHtml: censorHTMLtree(messageEl),
        });

        throw err;
      }

      const m = messageElChild.className.match(/\bm([0-9a-f]+)\b/);

      if (!m) {
        const err = new Error('Could not find message id value');

        this.#driver.getLogger().error(err, {
          reason: 'Element was missing message className',
          messageHtml: censorHTMLtree(messageEl),
        });

        throw err;
      }

      return m[1];
    }
  }

  async getMessageIDAsync(): Promise<string> {
    return this.getMessageID();
  }

  addAttachmentIcon(
    iconDescriptor:
      | MessageAttachmentIconDescriptor
      | Kefir.Stream<MessageAttachmentIconDescriptor, never>,
  ) {
    const attachmentIcon = new AttachmentIcon();

    if (!this.#element) {
      console.warn('addDateIcon called on destroyed message');
      return attachmentIcon;
    }

    this.#element.setAttribute(
      'inboxsdk__message_added_attachment_icon',
      'true',
    );

    const getImgElement = once(() => {
      const img = document.createElement('img');
      img.src = 'images/cleardot.gif';
      return img;
    });
    const getCustomIconWrapper = once(() => {
      const div = document.createElement('div');
      return div;
    });
    const getTooltipNodeWrapper = once(() => {
      const div = document.createElement('div');
      return div;
    });
    let added = false;
    let currentIconUrl: string | null = null;

    this.#stopper.onValue(() => {
      if (added) {
        getCustomIconWrapper().remove();
        getTooltipNodeWrapper().remove();
        getImgElement().remove();
        added = false;
      }
    });

    kefirCast(Kefir, iconDescriptor)
      .combine<any, any, any>(
        this.#eventStream
          .filter((event) => event.eventName === 'viewStateChange')
          .toProperty(() => null),
        (opts) => opts,
      )
      .takeUntilBy(this.#stopper)
      .onValue((opts) => {
        if (!opts) {
          if (added) {
            getCustomIconWrapper().remove();
            getImgElement().remove();
            getTooltipNodeWrapper().remove();
            added = false;
          }
        } else {
          let attachmentDiv;

          if (this.getViewState() === 'COLLAPSED') {
            attachmentDiv = querySelector(this.#element, '.adf.ads td.gH span');
          } else {
            attachmentDiv = querySelector(this.#element, 'td.gH div.gK span');
          }

          const img =
            opts.iconHtml != null ? getCustomIconWrapper() : getImgElement();
          const onClick = opts.onClick;

          if (onClick) {
            img.onclick = function (event) {
              event.preventDefault();
              event.stopPropagation();
              onClick();
            };

            img.style.cursor = 'pointer';
          } else {
            img.onclick = null;
            img.style.cursor = '';
          }

          if (
            opts.tooltip &&
            typeof opts.tooltip == 'object' &&
            opts.tooltip instanceof HTMLElement
          ) {
            const tooltipWrapper = getTooltipNodeWrapper();
            tooltipWrapper.className =
              'inboxsdk__message_attachment_tooltipWrapper';

            tooltipWrapper.onclick = function (event) {
              event.stopPropagation();
              reemitClickEvent(event);
            };

            tooltipWrapper.appendChild(opts.tooltip);

            img.onmouseenter = function (event) {
              event.preventDefault();
              event.stopPropagation();
              img.appendChild(tooltipWrapper);
              attachmentIcon.emit('tooltipShown');
            };

            img.onmouseleave = function (event) {
              event.preventDefault();
              event.stopPropagation();
              img.removeChild(tooltipWrapper);
              attachmentIcon.emit('tooltipHidden');
            };

            img.removeAttribute('data-tooltip');
          } else if (opts.tooltip && typeof opts.tooltip == 'string') {
            img.setAttribute('data-tooltip', opts.tooltip);
          } else {
            img.removeAttribute('data-tooltip');
          }

          img.className =
            opts.iconHtml != null
              ? `inboxsdk__message_attachment_iconWrapper ${
                  opts.iconClass || ''
                }`
              : 'inboxsdk__message_attachment_icon ' + (opts.iconClass || '');

          if (opts.iconHtml != null) {
            if (attachmentDiv.contains(getImgElement())) {
              getImgElement().remove();
            }

            img.innerHTML = opts.iconHtml;
          } else if (currentIconUrl != opts.iconUrl) {
            if (attachmentDiv.contains(getCustomIconWrapper())) {
              getCustomIconWrapper().remove();
            }

            img.style.background = opts.iconUrl
              ? 'url(' + opts.iconUrl + ') no-repeat 0 0'
              : '';
            currentIconUrl = opts.iconUrl;
          }

          if (!attachmentDiv.contains(img)) {
            attachmentDiv.appendChild(img);
            added = true;
          }
        }
      });
    return attachmentIcon;
  }

  getViewState(): VIEW_STATE {
    if (
      this.#element.classList.contains('kQ') ||
      this.#element.classList.contains('kx')
    ) {
      return 'HIDDEN';
    } else if (this.#element.classList.contains('kv')) {
      return 'COLLAPSED';
    } else {
      return 'EXPANDED';
    }
  }

  hasOpenReply(): boolean {
    return Boolean(this.#replyElement);
  }

  addAttachmentCard(options: Record<string, any>) {
    var gmailAttachmentCardView = new GmailAttachmentCardView(
      options,
      this.#driver,
      this,
    );

    if (!this.#gmailAttachmentAreaView) {
      this.#gmailAttachmentAreaView = this.#getAttachmentArea();
    }

    if (!this.#gmailAttachmentAreaView) {
      this.#gmailAttachmentAreaView = this.#createAttachmentArea();
    }

    this.#gmailAttachmentAreaView.addGmailAttachmentCardView(
      gmailAttachmentCardView,
    );

    return gmailAttachmentCardView;
  }

  #setupMessageStateStream() {
    var self = this;

    this.#eventStream.plug(
      makeMutationObserverStream(this.#element, {
        attributes: true,
        attributeFilter: ['class'],
        attributeOldValue: true,
      })
        .takeUntilBy(this.#stopper)
        .map(function (mutation) {
          const currentClassList = (mutation.target as HTMLElement).classList;
          const mutationOldValue = mutation.oldValue!;
          let oldValue: VIEW_STATE | undefined;
          let newValue: VIEW_STATE | undefined;

          if (
            mutationOldValue.indexOf('kQ') > -1 ||
            mutationOldValue.indexOf('kx') > -1
          ) {
            oldValue = 'HIDDEN';
          } else if (
            mutationOldValue.indexOf('kv') > -1 ||
            mutationOldValue.indexOf('ky') > -1
          ) {
            oldValue = 'COLLAPSED';
          } else if (mutationOldValue.indexOf('h7') > -1) {
            oldValue = 'EXPANDED';
          }

          if (
            currentClassList.contains('kQ') ||
            currentClassList.contains('kx')
          ) {
            newValue = 'HIDDEN';
          } else if (
            currentClassList.contains('kv') ||
            currentClassList.contains('ky')
          ) {
            newValue = 'COLLAPSED';
          } else if (currentClassList.contains('h7')) {
            newValue = 'EXPANDED';
          }

          return {
            oldValue,
            newValue,
            currentClassList,
          };
        })
        .map(function (event) {
          if (event.newValue === 'EXPANDED' && event.oldValue !== 'EXPANDED') {
            self.#checkMessageOpenState(event.currentClassList);
          }

          return event;
        })
        .filter(function (event) {
          return (
            event.newValue !== event.oldValue &&
            !!event.oldValue &&
            !!event.newValue
          );
        })
        .map(function (event) {
          return {
            eventName: 'viewStateChange',
            oldValue: event.oldValue,
            newValue: event.newValue,
          };
        }),
    );
  }

  #processInitialState() {
    this.#checkMessageOpenState(this.#element.classList);
  }

  #checkMessageOpenState(classList: Record<string, any>) {
    if (!classList.contains('h7')) {
      return;
    }

    if (this.#messageLoaded) {
      return;
    }

    let messageId;

    try {
      messageId = this.getMessageID(true);
    } catch (err) {
      this.#driver.getLogger().error(err);

      return;
    }

    this.#messageLoaded = true;

    try {
      this.#driver.associateThreadAndMessageIDs(
        this.#threadViewDriver.getThreadID(),
        messageId,
      );
    } catch (err) {
      this.#driver.getLogger().error(err);
    }

    this.#gmailAttachmentAreaView = this.#getAttachmentArea();

    this.#eventStream.emit({
      type: 'internal',
      eventName: 'messageLoad',
    });

    this.#setupReplyStream();
  }

  #setupReplyStream() {
    const replyContainer = this.#element.querySelector<HTMLElement>('.ip');

    if (!replyContainer) {
      return;
    }

    var self = this;
    var currentReplyElementRemovalStream: any = null;
    // hold off on emitting the mutation for a millisecond so
    // that compose-view-driver-stream is listening to reply stream
    Kefir.combine([
      makeMutationObserverChunkedStream(replyContainer, {
        attributes: true,
        attributeFilter: ['class'],
      }),
      Kefir.later(1, null),
    ])
      .merge(Kefir.later(1, undefined))
      .takeUntilBy(this.#stopper)
      .beforeEnd(() => 'END')
      .onValue((mutation) => {
        if (mutation !== 'END' && replyContainer.classList.contains('adB')) {
          if (!currentReplyElementRemovalStream) {
            const replyElement =
              replyContainer.firstElementChild as HTMLElement | null;
            self.#replyElement = replyElement;

            if (replyElement) {
              currentReplyElementRemovalStream = kefirBus();

              self.#eventStream.emit({
                type: 'internal',
                eventName: 'replyElement',
                change: {
                  el: replyElement,
                  removalStream: currentReplyElementRemovalStream,
                },
              });
            }
          }
        } else {
          if (currentReplyElementRemovalStream) {
            // Ending the currentReplyElementRemovalStream can trigger something
            // that triggers the mutation observer stream which will call back into
            // this function before we've unset currentReplyElementRemovalStream,
            // so we need to copy the bus to a temporary variable and unset
            // currentReplyElementRemovalStream first.
            var temp = currentReplyElementRemovalStream;
            currentReplyElementRemovalStream = null;
            temp.emit(null);
            temp.end();
            self.#replyElement = null;
          }
        }
      });
  }

  #monitorEmailAddressHovering() {
    var self = this;

    this.#eventStream.plug(
      Kefir.fromEvents<MouseEvent, unknown>(this.#element, 'mouseover')
        .map((e) => e.target)
        .filter(function (element) {
          return element && (element as any).getAttribute('email');
        })
        .map(function (element: HTMLElement) {
          let contactType = null;

          if (!self.#element.classList.contains('h7')) {
            contactType = 'sender';
          } else {
            if (
              (self.#element.querySelector('h3.iw') as any).contains(element)
            ) {
              contactType = 'sender';
            } else {
              contactType = 'recipient';
            }
          }

          return {
            get contact() {
              return self.#getUpdatedContact(
                _extractContactInformation(element),
              );
            },

            contactType: contactType,
            eventName: 'contactHover',
            messageViewDriver: self,
          };
        } as any),
    );
  }

  #getAttachmentArea(): GmailAttachmentAreaView | null | undefined {
    if (this.#element.querySelector('.hq')) {
      return new GmailAttachmentAreaView(
        this.#element.querySelector<HTMLElement>('.hq'),
        this.#driver,
        this,
      );
    }

    return null;
  }

  #createAttachmentArea(): GmailAttachmentAreaView {
    const gmailAttachmentAreaView = new GmailAttachmentAreaView(
      null,
      this.#driver,
      this,
    );
    const beforeElement = querySelector(this.#element, '.hi');
    const parentNode = beforeElement.parentNode;
    if (!parentNode) throw new Error('parentNode not found');
    parentNode.insertBefore(
      gmailAttachmentAreaView.getElement(),
      beforeElement,
    );
    return gmailAttachmentAreaView;
  }

  #getUpdatedContact(inContact: Contact): Contact {
    return getUpdatedContact(inContact, this.#element);
  }

  // Is this used?
  getReadyStream() {
    return this.#readyStream;
  }
}

function _extractContactInformation(span: HTMLElement) {
  return {
    name: span.getAttribute('name')!,
    emailAddress: span.getAttribute('email')!,
  };
}

export default GmailMessageView;
