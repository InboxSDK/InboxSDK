/* @flow */

import {defn} from 'ud';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type InboxDriver from '../inbox-driver';
import type {Parsed} from '../detection/message/parser';
import type {
  MessageViewDriver, MessageViewToolbarButtonDescriptor,
  MessageViewLinkDescriptor, VIEW_STATE
} from '../../../driver-interfaces/message-view-driver';

class InboxMessageView {
  _element: HTMLElement;
  _driver: InboxDriver;
  _p: Parsed;
  _eventStream: Kefir.Bus = kefirBus();

  constructor(element: HTMLElement, driver: InboxDriver, parsed: Parsed) {
    this._element = element;
    this._driver = driver;
    this._p = parsed;
  }

  getEventStream(): Kefir.Stream {
    return this._eventStream;
  }

  isLoaded() {
    // Currently we only instantiate InboxMessageViews when they're loaded.
    return true;
  }

  hasOpenReply() {
    // Inbox associates inline replies with threads, not messages.
    return false;
  }

  getMessageID(): string {
    if (!this._p.attributes.messageId) {
      throw new Error('Failed to find message id');
    }
    return this._p.attributes.messageId;
  }

  getContentsElement() {
    throw new Error('not implemented yet');
  }

  getLinks(): Array<MessageViewLinkDescriptor> {
    throw new Error('not implemented yet');
  }
  isElementInQuotedArea(el: HTMLElement): boolean {
    throw new Error('not implemented yet');
  }
  addMoreMenuItem(options: MessageViewToolbarButtonDescriptor): void {
    throw new Error('not implemented yet');
  }
  addAttachmentIcon(options: Object): void {
    throw new Error('not implemented yet');
  }
  getAttachmentCardViewDrivers(): Array<Object> {
    throw new Error('not implemented yet');
  }
  addAttachmentCard(options: Object): Object {
    throw new Error('not implemented yet');
  }
  addAttachmentCardNoPreview(options: Object): Object {
    throw new Error('not implemented yet');
  }
  addButtonToDownloadAllArea(options: Object): void {
    throw new Error('not implemented yet');
  }
  getViewState(): VIEW_STATE {
    throw new Error('not implemented yet');
  }
  getDateString(): string {
    throw new Error('not implemented yet');
  }
  getSender(): Contact {
    throw new Error('not implemented yet');
  }
  getRecipients(): Array<Contact> {
    throw new Error('not implemented yet');
  }

  getThreadViewDriver() {
    throw new Error('not implemented yet');
  }

  destroy() {
    this._eventStream.end();
  }
}

export default defn(module, InboxMessageView);

// This function does not get executed. It's only checked by Flow to make sure
// this class successfully implements the type interface.
function __interfaceCheck() {
	const test: MessageViewDriver = new InboxMessageView(({}:any), ({}:any), ({}:any));
}
