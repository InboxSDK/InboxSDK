import { defonce } from 'ud';
import asap from 'asap';
import EventEmitter from '../../lib/safe-event-emitter';
import type Membrane from '../../lib/Membrane';
import get from '../../../common/get-or-fail';
import type AttachmentCardView from './attachment-card-view';
import Conversations, {
  MessageViewToolbarSectionNames,
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

type MessageViewLinkDescriptor = {
  text: string;
  html: string;
  element: HTMLElement;
  href: string;
  isInQuotedArea: boolean;
};

interface Members {
  Conversations: Conversations;
  driver: Driver;
  linksInBody: Array<MessageViewLinkDescriptor> | null | undefined;
  membrane: Membrane;
  messageViewImplementation: MessageViewDriver;
}

export type MessageViewEvent = {
  contactHover(
    data: Omit<MessageViewDriverEventByName['contactHover'], 'eventName'>
  ): void;
  destroy(): void;
  load(data: { messageView: MessageView }): void;
  viewStateChange(data: {
    oldViewState: VIEW_STATE;
    newViewState: VIEW_STATE;
    messageView: MessageView;
  }): void;
};

const memberMap = defonce(module, () => new WeakMap<MessageView, Members>());

class MessageView
  extends (EventEmitter as new () => TypedEventEmitter<MessageViewEvent>)
  implements IMessageView
{
  destroyed: boolean = false;

  constructor(
    messageViewImplementation: MessageViewDriver,
    appId: string,
    membrane: Membrane,
    Conversations: Conversations,
    driver: Driver
  ) {
    super();
    const members = {
      messageViewImplementation,
      membrane,
      Conversations,
      driver,
      linksInBody: null as Array<MessageViewLinkDescriptor> | null | undefined,
    };
    memberMap.set(this, members);

    _bindToEventStream(
      this,
      members,
      messageViewImplementation.getEventStream()
    );
  }

  addAttachmentCardView(cardOptions: Record<string, any>): AttachmentCardView {
    const { messageViewImplementation, membrane } = get(memberMap, this);
    const attachmentCardViewDriver =
      messageViewImplementation.addAttachmentCard(cardOptions);
    const attachmentCardView = membrane.get(attachmentCardViewDriver);
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
    cardOptions: Record<string, any>
  ): AttachmentCardView {
    return this.addAttachmentCardView(cardOptions);
  }

  addAttachmentsToolbarButton(buttonOptions: Record<string, any>) {
    const { messageViewImplementation, membrane } = get(memberMap, this);
    messageViewImplementation.addButtonToDownloadAllArea({
      tooltip: buttonOptions.tooltip,
      iconUrl: buttonOptions.iconUrl,
      onClick: () => {
        const attachmentCardViews = messageViewImplementation
          .getAttachmentCardViewDrivers()
          .map((cardDriver) => membrane.get(cardDriver));
        buttonOptions.onClick({
          attachmentCardViews,
        });
      },
    });
  }

  addToolbarButton(
    buttonOptions?: Parameters<IMessageView['addToolbarButton']>[0]
  ) {
    if (
      typeof buttonOptions!.onClick !== 'function' ||
      typeof buttonOptions!.title !== 'string' ||
      !Object.prototype.hasOwnProperty.call(
        MessageViewToolbarSectionNames,
        buttonOptions!.section
      )
    ) {
      throw new Error(
        'Missing required properties on MessageViewToolbarButtonDescriptor object'
      );
    }

    const { messageViewImplementation } = get(memberMap, this);
    messageViewImplementation.addMoreMenuItem(buttonOptions!);
  }

  getBodyElement(): HTMLElement {
    return get(memberMap, this).messageViewImplementation.getContentsElement();
  }

  getMessageID(): string {
    get(memberMap, this)
      .driver.getLogger()
      .deprecationWarning(
        'messageView.getMessageID',
        'messageView.getMessageIDAsync'
      );
    return get(memberMap, this).messageViewImplementation.getMessageID();
  }

  getMessageIDAsync(): Promise<string> {
    return get(memberMap, this).messageViewImplementation.getMessageIDAsync();
  }

  // TODO non-file-attachment card views are asynchronously loaded. Add some sort of
  // registerAttachmentCardViewHandler function to listen for other types of
  // attachment cards if we want to continue support for them.
  getFileAttachmentCardViews(): Array<AttachmentCardView> {
    const { messageViewImplementation, membrane } = get(memberMap, this);
    return messageViewImplementation
      .getAttachmentCardViewDrivers()
      .filter((cardDriver) => cardDriver.getAttachmentType() === 'FILE')
      .map((attachmentCardViewDriver) =>
        membrane.get(attachmentCardViewDriver)
      );
  }

  // Deprecated name
  getAttachmentCardViews(): Array<AttachmentCardView> {
    const { driver } = get(memberMap, this);
    driver
      .getLogger()
      .deprecationWarning(
        'MessageView.getAttachmentCardViews',
        'MessageView.getFileAttachmentCardViews'
      );

    if (driver.getOpts().REQUESTED_API_VERSION !== 1) {
      throw new Error('This method was discontinued after API version 1');
    }

    return this.getFileAttachmentCardViews();
  }

  isElementInQuotedArea(element: HTMLElement): boolean {
    return get(memberMap, this).messageViewImplementation.isElementInQuotedArea(
      element
    );
  }

  isLoaded(): boolean {
    return get(memberMap, this).messageViewImplementation.isLoaded();
  }

  getLinksInBody(): Array<MessageViewLinkDescriptor> {
    const members = get(memberMap, this);

    if (!members.linksInBody) {
      const anchors = this.getBodyElement().querySelectorAll('a');
      members.linksInBody = Array.from(anchors).map(
        (anchor: HTMLAnchorElement) => ({
          text: anchor.textContent!,
          html: anchor.innerHTML,
          href: anchor.href,
          element: anchor,
          isInQuotedArea: this.isElementInQuotedArea(anchor),
        })
      );
    }

    return members.linksInBody;
  }

  getSender(): Contact {
    return get(memberMap, this).messageViewImplementation.getSender();
  }

  getRecipients(): Array<Contact> {
    get(memberMap, this)
      .driver.getLogger()
      .deprecationWarning(
        'MessageView.getRecipients',
        'MessageView.getRecipientEmailAddresses() or MessageView.getRecipientsFull()'
      );
    return this.getRecipientEmailAddresses().map((emailAddress) => ({
      emailAddress,
      name: null!,
    }));
  }

  getRecipientEmailAddresses(): Array<string> {
    return get(
      memberMap,
      this
    ).messageViewImplementation.getRecipientEmailAddresses();
  }

  getRecipientsFull(): Promise<Array<Contact>> {
    return get(memberMap, this).messageViewImplementation.getRecipientsFull();
  }

  getThreadView(): ReturnType<IMessageView['getThreadView']> {
    const { messageViewImplementation, membrane } = get(memberMap, this);
    return membrane.get(messageViewImplementation.getThreadViewDriver());
  }

  getDateString(): string {
    return get(memberMap, this).messageViewImplementation.getDateString();
  }

  addAttachmentIcon(
    iconDescriptor: Parameters<IMessageView['addAttachmentIcon']>[0]
  ) {
    return get(memberMap, this).messageViewImplementation.addAttachmentIcon(
      iconDescriptor
    );
  }

  getViewState(): VIEW_STATE {
    const members = get(memberMap, this);
    return members.Conversations.MessageViewViewStates[
      members.messageViewImplementation.getViewState()
    ];
  }

  hasOpenReply(): boolean {
    const { driver } = get(memberMap, this);
    driver.getLogger().deprecationWarning('MessageView.hasOpenReply');

    if (driver.getOpts().REQUESTED_API_VERSION !== 1) {
      throw new Error('This method was discontinued after API version 1');
    }

    return get(memberMap, this).messageViewImplementation.hasOpenReply();
  }
}

function _bindToEventStream(
  messageView: MessageView,
  members: Members,
  stream: Observable<MessageViewDriverEvents, any>
) {
  stream.onEnd(function () {
    messageView.destroyed = true;
    messageView.emit('destroy');
    messageView.removeAllListeners();
  });
  stream
    .filter(function (
      event
    ): event is MessageViewDriverEventByName['contactHover'] {
      return event.type !== 'internal' && event.eventName === 'contactHover';
    })
    .onValue(function (event) {
      messageView.emit(event.eventName, {
        contactType: event.contactType,
        contact: event.contact,
        messageView: messageView,
        threadView: messageView.getThreadView(),
      });
    });

  if (messageView.isLoaded()) {
    asap(() => {
      messageView.emit('load', {
        messageView,
      });
    });
  } else {
    stream
      .filter((event) => event.eventName === 'messageLoad')
      .onValue(() => {
        messageView.emit('load', {
          messageView: messageView,
        });
      });
  }

  stream
    .filter(function (
      event
    ): event is MessageViewDriverEventByName['viewStateChange'] {
      return event.eventName === 'viewStateChange';
    })
    .onValue(function (event) {
      messageView.emit('viewStateChange', {
        oldViewState:
          members.Conversations.MessageViewViewStates[event.oldValue!],
        newViewState:
          members.Conversations.MessageViewViewStates[event.newValue!],
        messageView: messageView,
      });
    });
}

export default MessageView;
