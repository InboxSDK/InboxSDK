import asap from 'asap';
import EventEmitter from '../../lib/safe-event-emitter';
import type Membrane from '../../lib/Membrane';
import type AttachmentCardView from './attachment-card-view';
import {
  MessageViewToolbarSectionNames,
  MessageViewViewStates,
} from '../../namespaces/conversations';
import type { Driver } from '../../driver-interfaces/driver';
import type { Contact, MessageView as IMessageView } from '../../../inboxsdk';
import type { Observable } from 'kefir';
import type {
  MessageViewDriverEvents,
  MessageViewDriverEventByName,
} from '../../dom-driver/gmail/views/gmail-message-view';
import type TypedEventEmitter from 'typed-emitter';
import type MessageViewDriver from '../../dom-driver/gmail/views/gmail-message-view';

export type VIEW_STATE = 'HIDDEN' | 'COLLAPSED' | 'EXPANDED';

interface MessageViewLinkDescriptor {
  text: string;
  html: string;
  element: HTMLElement;
  href: string;
  isInQuotedArea: boolean;
}

export type MessageViewEvent = {
  contactHover(
    data: Omit<MessageViewDriverEventByName['contactHover'], 'eventName'>,
  ): void;
  destroy(): void;
  load(data: { messageView: MessageView }): void;
  viewStateChange(data: {
    oldViewState: VIEW_STATE;
    newViewState: VIEW_STATE;
    messageView: MessageView;
  }): void;
};

export default class MessageView
  extends (EventEmitter as new () => TypedEventEmitter<MessageViewEvent>)
  implements IMessageView
{
  destroyed: boolean = false;

  #driver: Driver;
  #linksInBody: Array<MessageViewLinkDescriptor> | null | undefined;
  #membrane: Membrane;
  #messageViewImplementation: MessageViewDriver;

  constructor(
    messageViewImplementation: MessageViewDriver,
    membrane: Membrane,
    driver: Driver,
  ) {
    super();
    this.#driver = driver;
    this.#linksInBody = null;
    this.#membrane = membrane;
    this.#messageViewImplementation = messageViewImplementation;

    this.#bindToEventStream(messageViewImplementation.getEventStream());
  }

  addAttachmentCardView(cardOptions: Record<string, any>): AttachmentCardView {
    const attachmentCardViewDriver =
      this.#messageViewImplementation.addAttachmentCard(cardOptions);
    const attachmentCardView = this.#membrane.get(attachmentCardViewDriver);
    attachmentCardViewDriver.getPreviewClicks().onValue((e) => {
      if (cardOptions.previewOnClick) {
        cardOptions.previewOnClick({
          attachmentCardView,
          preventDefault: () => e.preventDefault(),
        });
      }
    });
    return attachmentCardView;
  }

  // TODO why is this a separate method?
  addAttachmentCardViewNoPreview(
    cardOptions: Record<string, any>,
  ): AttachmentCardView {
    return this.addAttachmentCardView(cardOptions);
  }

  addAttachmentsToolbarButton(buttonOptions: Record<string, any>) {
    this.#messageViewImplementation.addButtonToDownloadAllArea({
      tooltip: buttonOptions.tooltip,
      iconUrl: buttonOptions.iconUrl,
      onClick: () => {
        const attachmentCardViews = this.#messageViewImplementation
          .getAttachmentCardViewDrivers()
          .map((cardDriver) => this.#membrane.get(cardDriver));
        buttonOptions.onClick({
          attachmentCardViews,
        });
      },
    });
  }

  addToolbarButton(
    buttonOptions: Parameters<IMessageView['addToolbarButton']>[0],
  ) {
    if (
      typeof buttonOptions.onClick !== 'function' ||
      typeof buttonOptions.title !== 'string' ||
      !Object.prototype.hasOwnProperty.call(
        MessageViewToolbarSectionNames,
        buttonOptions.section,
      )
    ) {
      throw new Error(
        'Missing required properties on MessageViewToolbarButtonDescriptor object',
      );
    }

    this.#messageViewImplementation.addMoreMenuItem(buttonOptions);
  }

  getBodyElement(): HTMLElement {
    return this.#messageViewImplementation.getContentsElement();
  }

  getMessageID(): string {
    this.#driver
      .getLogger()
      .deprecationWarning(
        'messageView.getMessageID',
        'messageView.getMessageIDAsync',
      );
    return this.#messageViewImplementation.getMessageID();
  }

  getMessageIDAsync(): Promise<string> {
    return this.#messageViewImplementation.getMessageIDAsync();
  }

  // TODO non-file-attachment card views are asynchronously loaded. Add some sort of
  // registerAttachmentCardViewHandler function to listen for other types of
  // attachment cards if we want to continue support for them.
  getFileAttachmentCardViews(): Array<AttachmentCardView> {
    return this.#messageViewImplementation
      .getAttachmentCardViewDrivers()
      .filter((cardDriver) => cardDriver.getAttachmentType() === 'FILE')
      .map((attachmentCardViewDriver) =>
        this.#membrane.get(attachmentCardViewDriver),
      );
  }

  // Deprecated name
  getAttachmentCardViews(): Array<AttachmentCardView> {
    this.#driver
      .getLogger()
      .deprecationWarning(
        'MessageView.getAttachmentCardViews',
        'MessageView.getFileAttachmentCardViews',
      );

    if (this.#driver.getOpts().REQUESTED_API_VERSION !== 1) {
      throw new Error('This method was discontinued after API version 1');
    }

    return this.getFileAttachmentCardViews();
  }

  isElementInQuotedArea(element: HTMLElement): boolean {
    return this.#messageViewImplementation.isElementInQuotedArea(element);
  }

  isLoaded(): boolean {
    return this.#messageViewImplementation.isLoaded();
  }

  getLinksInBody(): Array<MessageViewLinkDescriptor> {
    if (!this.#linksInBody) {
      const anchors = this.getBodyElement().querySelectorAll('a');
      this.#linksInBody = Array.from(anchors).map(
        (anchor: HTMLAnchorElement) => ({
          text: anchor.textContent!,
          html: anchor.innerHTML,
          href: anchor.href,
          element: anchor,
          isInQuotedArea: this.isElementInQuotedArea(anchor),
        }),
      );
    }

    return this.#linksInBody;
  }

  getSender(): Contact {
    return this.#messageViewImplementation.getSender();
  }

  getRecipients(): Array<Contact> {
    this.#driver
      .getLogger()
      .deprecationWarning(
        'MessageView.getRecipients',
        'MessageView.getRecipientEmailAddresses() or MessageView.getRecipientsFull()',
      );
    return this.getRecipientEmailAddresses().map((emailAddress) => ({
      emailAddress,
      name: null!,
    }));
  }

  getRecipientEmailAddresses(): Array<string> {
    return this.#messageViewImplementation.getRecipientEmailAddresses();
  }

  getRecipientsFull(): Promise<Array<Contact>> {
    return this.#messageViewImplementation.getRecipientsFull();
  }

  getThreadView(): ReturnType<IMessageView['getThreadView']> {
    return this.#membrane.get(
      this.#messageViewImplementation.getThreadViewDriver(),
    );
  }

  getDateString(): string {
    return this.#messageViewImplementation.getDateString();
  }

  addAttachmentIcon(
    iconDescriptor: Parameters<IMessageView['addAttachmentIcon']>[0],
  ) {
    return this.#messageViewImplementation.addAttachmentIcon(iconDescriptor);
  }

  getViewState(): VIEW_STATE {
    return MessageViewViewStates[
      this.#messageViewImplementation.getViewState()
    ];
  }

  hasOpenReply(): boolean {
    this.#driver.getLogger().deprecationWarning('MessageView.hasOpenReply');

    if (this.#driver.getOpts().REQUESTED_API_VERSION !== 1) {
      throw new Error('This method was discontinued after API version 1');
    }

    return this.#messageViewImplementation.hasOpenReply();
  }

  #bindToEventStream(stream: Observable<MessageViewDriverEvents, any>) {
    stream.onEnd(() => {
      this.destroyed = true;
      this.emit('destroy');
      this.removeAllListeners();
    });
    stream
      .filter(
        (event): event is MessageViewDriverEventByName['contactHover'] =>
          event.type !== 'internal' && event.eventName === 'contactHover',
      )
      .onValue((event) => {
        this.emit(event.eventName, {
          contactType: event.contactType,
          contact: event.contact,
          messageView: this,
          threadView: this.getThreadView(),
        });
      });

    if (this.isLoaded()) {
      asap(() => {
        this.emit('load', {
          messageView: this,
        });
      });
    } else {
      stream
        .filter((event) => event.eventName === 'messageLoad')
        .onValue(() => {
          this.emit('load', {
            messageView: this,
          });
        });
    }

    stream
      .filter(
        (event): event is MessageViewDriverEventByName['viewStateChange'] =>
          event.eventName === 'viewStateChange',
      )
      .onValue((event) => {
        this.emit('viewStateChange', {
          oldViewState: MessageViewViewStates[event.oldValue],
          newViewState: MessageViewViewStates[event.newValue],
          messageView: this,
        });
      });
  }
}
