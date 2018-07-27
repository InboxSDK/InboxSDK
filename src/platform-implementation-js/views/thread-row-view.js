/* @flow */

import EventEmitter from '../lib/safe-event-emitter';
import type GmailThreadRowView from '../dom-driver/gmail/views/gmail-thread-row-view.js';
import type InboxThreadRowView from '../dom-driver/inbox/views/inbox-thread-row-view.js';
import get from '../../common/get-or-fail';

const membersMap = new WeakMap();

// documented in src/docs/
export default class ThreadRowView extends EventEmitter {
  destroyed: boolean;

  constructor(threadRowViewDriver: GmailThreadRowView|InboxThreadRowView){
    super();
    const members = {threadRowViewDriver};
    membersMap.set(this, members);

    this.destroyed = false;

    threadRowViewDriver.getEventStream().onEnd(() => {
      this.destroyed = true;
      this.emit('destroy');
    });
    threadRowViewDriver.setUserView(this);
  }

  addLabel(labelDescriptor: Object) {
    get(membersMap, this).threadRowViewDriver.addLabel(labelDescriptor);
  }

  addImage(imageDescriptor: Object){
    get(membersMap, this).threadRowViewDriver.addImage(imageDescriptor);
  }

  addButton(buttonDescriptor: Object) {
    get(membersMap, this).threadRowViewDriver.addButton(buttonDescriptor);
  }

  addActionButton(actionButtonDescriptor: Object) {
    get(membersMap, this).threadRowViewDriver.addActionButton(actionButtonDescriptor);
  }

  addAttachmentIcon(threadRowAttachmentIconDescriptor: Object) {
    get(membersMap, this).threadRowViewDriver.addAttachmentIcon(threadRowAttachmentIconDescriptor);
  }

  replaceDate(threadRowDateDescriptor: Object) {
    get(membersMap, this).threadRowViewDriver.replaceDate(threadRowDateDescriptor);
  }

  replaceDraftLabel(draftLabelDescriptor: Object) {
    get(membersMap, this).threadRowViewDriver.replaceDraftLabel(draftLabelDescriptor);
  }

  getSubject(): string {
    return get(membersMap, this).threadRowViewDriver.getSubject();
  }

  getDateString(): string {
    return get(membersMap, this).threadRowViewDriver.getDateString();
  }

  getThreadID(): string {
    // TODO mark deprecated
    return get(membersMap, this).threadRowViewDriver.getThreadID();
  }

  getThreadIDAsync(): Promise<string> {
    return get(membersMap, this).threadRowViewDriver.getThreadIDAsync();
  }

  getThreadIDIfStable(): ?string {
    // TODO mark deprecated
    if (this.getVisibleMessageCount() > 0) {
      return this.getThreadID();
    } else {
      return null;
    }
  }

  getThreadIDIfStableAsync(): Promise<null|string> {
    if (this.getVisibleMessageCount() > 0) {
      return this.getThreadIDAsync();
    } else {
      return Promise.resolve(null);
    }
  }

  getDraftID(): Promise<?string> {
    return get(membersMap, this).threadRowViewDriver.getDraftID();
  }

  getVisibleDraftCount(): number {
    return get(membersMap, this).threadRowViewDriver.getVisibleDraftCount();
  }

  getVisibleMessageCount(): number {
    return get(membersMap, this).threadRowViewDriver.getVisibleMessageCount();
  }

  getContacts(): Contact[] {
    return get(membersMap, this).threadRowViewDriver.getContacts();
  }
}
