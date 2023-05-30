import EventEmitter from '../lib/safe-event-emitter';
import type GmailThreadRowView from '../dom-driver/gmail/views/gmail-thread-row-view';
import get from '../../common/get-or-fail';
import { Contact } from '../../inboxsdk';
const membersMap = new WeakMap(); // documented in src/docs/

export default class ThreadRowView extends EventEmitter {
  destroyed: boolean;

  constructor(threadRowViewDriver: GmailThreadRowView) {
    super();
    const members = {
      threadRowViewDriver,
    };
    membersMap.set(this, members);
    this.destroyed = false;
    threadRowViewDriver.getEventStream().onEnd(() => {
      this.destroyed = true;
      this.emit('destroy');
    });
    threadRowViewDriver.setUserView(this);
  }

  addLabel(labelDescriptor: Record<string, any>) {
    get(membersMap, this).threadRowViewDriver.addLabel(labelDescriptor);
  }

  addImage(imageDescriptor: Record<string, any>) {
    get(membersMap, this).threadRowViewDriver.addImage(imageDescriptor);
  }

  addButton(buttonDescriptor: Record<string, any>) {
    get(membersMap, this).threadRowViewDriver.addButton(buttonDescriptor);
  }

  addActionButton(actionButtonDescriptor: Record<string, any>) {
    get(membersMap, this).threadRowViewDriver.addActionButton(
      actionButtonDescriptor
    );
  }

  addAttachmentIcon(threadRowAttachmentIconDescriptor: Record<string, any>) {
    get(membersMap, this).threadRowViewDriver.addAttachmentIcon(
      threadRowAttachmentIconDescriptor
    );
  }

  replaceDate(threadRowDateDescriptor: Record<string, any>) {
    get(membersMap, this).threadRowViewDriver.replaceDate(
      threadRowDateDescriptor
    );
  }

  replaceDraftLabel(draftLabelDescriptor: Record<string, any>) {
    get(membersMap, this).threadRowViewDriver.replaceDraftLabel(
      draftLabelDescriptor
    );
  }

  getElement(): HTMLElement {
    return get(membersMap, this).threadRowViewDriver.getElement();
  }

  getSubject(): string {
    return get(membersMap, this).threadRowViewDriver.getSubject();
  }

  replaceSubject(newSubjectStr: string) {
    get(membersMap, this).threadRowViewDriver.replaceSubject(newSubjectStr);
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

  getThreadIDIfStable(): string | null | undefined {
    // TODO mark deprecated
    if (this.getVisibleMessageCount() > 0) {
      return this.getThreadID();
    } else {
      return null;
    }
  }

  getThreadIDIfStableAsync(): Promise<null | string> {
    if (this.getVisibleMessageCount() > 0) {
      return this.getThreadIDAsync();
    } else {
      return Promise.resolve(null);
    }
  }

  getDraftID(): Promise<string | null | undefined> {
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
