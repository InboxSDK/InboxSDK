import type * as Kefir from 'kefir';
import type { AttachmentCardViewDriver } from './driver';
import type {
  MessageView,
  MessageViewToolbarButtonDescriptor,
} from '../../inboxsdk';

export type VIEW_STATE = 'HIDDEN' | 'COLLAPSED' | 'EXPANDED';
export type MessageViewLinkDescriptor = {
  text: string;
  html: string;
  element: HTMLElement;
  href: string;
  isInQuotedArea: boolean;
};
export type MessageViewDriver = MessageView & {
  getMessageID(): string;
  getContentsElement(): HTMLElement;
  addMoreMenuItem(options: MessageViewToolbarButtonDescriptor): void;
  getAttachmentCardViewDrivers(): Array<AttachmentCardViewDriver>;
  addAttachmentCard(options: Record<string, any>): AttachmentCardViewDriver;
  addButtonToDownloadAllArea(options: Record<string, any>): void;
  getEventStream(): Kefir.Observable<Record<string, any>, unknown>;
  getViewState(): VIEW_STATE;
  getDateString(): string;
  getReadyStream(): Kefir.Observable<any, unknown>;
  getRecipientEmailAddresses(): Array<string>;
  getThreadViewDriver(): Record<string, any>;
  hasOpenReply(): boolean;
};
