import type * as Kefir from 'kefir';
import type { AttachmentCardViewDriver } from './driver';
import type {
  AttachmentIcon,
  Contact,
  MessageAttachmentIconDescriptor,
  MessageViewToolbarButtonDescriptor,
} from '../../inboxsdk';
import { type MessageViewDriverEvents } from '../dom-driver/gmail/views/gmail-message-view';

export type VIEW_STATE = 'HIDDEN' | 'COLLAPSED' | 'EXPANDED';
export type MessageViewLinkDescriptor = {
  text: string;
  html: string;
  element: HTMLElement;
  href: string;
  isInQuotedArea: boolean;
};
export interface MessageViewDriver {
  addAttachmentIcon(
    opts:
      | MessageAttachmentIconDescriptor
      | Kefir.Stream<MessageAttachmentIconDescriptor, never>
  ): AttachmentIcon;
  isElementInQuotedArea(element: HTMLElement): boolean;
  getMessageID(): string;
  getContentsElement(): HTMLElement;
  addMoreMenuItem(options: MessageViewToolbarButtonDescriptor): void;
  getAttachmentCardViewDrivers(): Array<AttachmentCardViewDriver>;
  addAttachmentCard(options: Record<string, any>): AttachmentCardViewDriver;
  addButtonToDownloadAllArea(options: Record<string, any>): void;
  getEventStream(): Kefir.Observable<MessageViewDriverEvents, unknown>;
  getMessageIDAsync(): Promise<string>;
  getRecipientsFull(): Promise<Array<Contact>>;
  getViewState(): VIEW_STATE;
  getDateString(): string;
  getReadyStream(): Kefir.Observable<any, unknown>;
  getRecipientEmailAddresses(): Array<string>;
  getSender(): Contact;
  getThreadViewDriver(): Record<string, any>;
  hasOpenReply(): boolean;
  isLoaded(): boolean;
}
