/* @flow */

import _ from 'lodash';
import EventEmitter from '../lib/safe-event-emitter';
import type GmailThreadRowView from '../dom-driver/gmail/views/gmail-thread-row-view.js';

// documented in src/docs/
export default class ThreadRowView extends EventEmitter {
  destroyed: boolean;
  _threadRowViewDriver: GmailThreadRowView;

  constructor(threadRowViewDriver: GmailThreadRowView){
    super();
    this.destroyed = false;
    this._threadRowViewDriver = threadRowViewDriver;
    this._threadRowViewDriver.getEventStream().onEnd(() => {
      this.destroyed = true;
      this.emit('destroy');
    });
    this._threadRowViewDriver.setUserView(this);
  }

  addLabel(labelDescriptor: Object) {
    this._threadRowViewDriver.addLabel(labelDescriptor);
  }

  addImage(imageDescriptor: Object){
    this._threadRowViewDriver.addImage(imageDescriptor);
  }

  addButton(buttonDescriptor: Object) {
    this._threadRowViewDriver.addButton(buttonDescriptor);
  }

  addActionButton(actionButtonDescriptor: Object) {
    this._threadRowViewDriver.addActionButton(actionButtonDescriptor);
  }

  addAttachmentIcon(threadRowAttachmentIconDescriptor: Object) {
    this._threadRowViewDriver.addAttachmentIcon(threadRowAttachmentIconDescriptor);
  }

  replaceDate(threadRowDateDescriptor: Object) {
    this._threadRowViewDriver.replaceDate(threadRowDateDescriptor);
  }

  replaceDraftLabel(draftLabelDescriptor: Object) {
    this._threadRowViewDriver.replaceDraftLabel(draftLabelDescriptor);
  }

  getSubject(): string {
    return this._threadRowViewDriver.getSubject();
  }

  getDateString(): string {
    return this._threadRowViewDriver.getDateString();
  }

  getThreadID(): string {
    // TODO mark deprecated
    return this._threadRowViewDriver.getThreadID();
  }

  getThreadIDAsync(): Promise<string> {
    return this._threadRowViewDriver.getThreadIDAsync();
  }

  getThreadIDIfStable(): ?string {
    if (this.getVisibleMessageCount() > 0) {
      return this.getThreadID();
    } else {
      return null;
    }
  }

  getDraftID(): Promise<?string> {
    return this._threadRowViewDriver.getDraftID();
  }

  getVisibleDraftCount(): number {
    return this._threadRowViewDriver.getVisibleDraftCount();
  }

  getVisibleMessageCount(): number {
    return this._threadRowViewDriver.getVisibleMessageCount();
  }

  getContacts(): Contact[] {
    return this._threadRowViewDriver.getContacts();
  }
}
