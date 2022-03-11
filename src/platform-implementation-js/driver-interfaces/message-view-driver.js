/* @flow */

import Kefir from 'kefir';
import type { AttachmentCardViewDriver } from './driver';
import SafeEventEmitter from '../lib/safe-event-emitter';

export type VIEW_STATE = 'HIDDEN' | 'COLLAPSED' | 'EXPANDED';

export type MessageViewLinkDescriptor = {
  text: string,
  html: string,
  element: HTMLElement,
  href: string,
  isInQuotedArea: boolean,
};

export type MessageViewToolbarButtonDescriptor = {
  section: 'MORE',
  title: string,
  iconUrl?: ?string,
  iconClass?: ?string,
  onClick(): void,
  orderHint?: ?number,
};

export type AttachmentIcon = SafeEventEmitter & {};

export type MessageViewDriver = {
  getMessageID(): string,
  getMessageIDAsync(): Promise<string>,
  getContentsElement(): HTMLElement,
  isElementInQuotedArea(el: HTMLElement): boolean,
  addMoreMenuItem(options: MessageViewToolbarButtonDescriptor): void,
  addAttachmentIcon(options: Object): AttachmentIcon,
  getAttachmentCardViewDrivers(): Array<AttachmentCardViewDriver>,
  addAttachmentCard(options: Object): AttachmentCardViewDriver,
  addButtonToDownloadAllArea(options: Object): void,
  getEventStream(): Kefir.Observable<Object>,
  getViewState(): VIEW_STATE,
  getDateString(): string,
  getSender(): Contact,
  getReadyStream(): Kefir.Observable<any>,
  getRecipients(): Array<Contact>,
  getRecipientEmailAddresses(): Array<string>,
  getRecipientsFull(): Promise<Array<Contact>>,
  getThreadViewDriver(): Object,
  isLoaded(): boolean,
  hasOpenReply(): boolean,
};
