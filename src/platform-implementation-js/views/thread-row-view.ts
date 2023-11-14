import EventEmitter from '../lib/safe-event-emitter';
import type GmailThreadRowView from '../dom-driver/gmail/views/gmail-thread-row-view';
import get from '../../common/get-or-fail';
import type {
  Contact,
  LabelDescriptor,
  ThreadDateDescriptor,
  DraftLabelDescriptor,
} from '../../inboxsdk';
import { Observable } from 'kefir';
import type TypedEventEmitter from 'typed-emitter';

export interface ImageDescriptor {
  imageUrl?: string;
  imageClass?: string;
  tooltip?: string;
  orderHint?: number;
}

type EmitterType = TypedEventEmitter<{ destroy: () => void }>;

export type IThreadRowView = EmitterType & {
  /**
   * This property is set to true once the view is destroyed
   */
  readonly destroyed: boolean;
  addLabel(
    labelDescriptor:
      | LabelDescriptor
      | Observable<LabelDescriptor | null, unknown>
      | null,
  ): void;
  addAttachmentIcon(threadRowAttachmentIconDescriptor: any): void;
  addImage(
    imageDescriptor: ImageDescriptor | Observable<ImageDescriptor | null, any>,
  ): void;
  getElement(): HTMLElement;
  /**
   * @returns the {number} of visible draft messages in the row. This is purely an estimate based on what is visible in the row.
   */
  getVisibleDraftCount(): number;
  /** @deprecated */
  getThreadIDIfStable(): string | null | undefined;
  /**
   * Gets the Gmail Thread ID of the thread only if the thread ID is stable. Some threads such as those with only a single Draft message in them will occasionally change their thread ID. If you're using the thread ID as a key, you may experience unexpected behavior if you're not careful about this fact. This method provides you with an easy way to tell if the thread has a stable ID.
   *
   * @return a Promise<String> for the thread ID if it is expected to stay the same, otherwise it will return a Promise<null>
   */
  getThreadIDIfStableAsync(): Promise<string | null>;
  addButton(threadRowButtonDescriptor: any): void;
  /** @deprecated */
  getThreadID(): string;
  /**
   * @returns a Promise<String> of the Gmail Thread ID of the thread
   */
  getThreadIDAsync(): Promise<string>;

  /**
   * Returns a Promise<String> for the thread row's draft ID, if the thread row represents a single draft. Otherwise the promise may resolve to null.
   */
  getDraftID(): Promise<string | null | undefined>;
  replaceDate(
    threadDateDescriptor:
      | ThreadDateDescriptor
      | null
      | Observable<ThreadDateDescriptor | null, any>,
  ): void;
  /**
   * @returns the {number} of visible messages in the thread based on the visible numeric marker.
   */
  getVisibleMessageCount(): number;
  getSubject(): string;
  replaceSubject(newSubjectStr: string): void;
  getContacts(): Array<{ name: string | null; emailAddress: string }>;
  replaceDraftLabel(
    descriptor:
      | DraftLabelDescriptor
      | null
      | Observable<DraftLabelDescriptor | null, any>,
  ): void;
};

const membersMap = new WeakMap<
  ThreadRowView,
  { threadRowViewDriver: GmailThreadRowView }
>();

export default class ThreadRowView
  extends (EventEmitter as new () => EmitterType)
  implements IThreadRowView
{
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

  addLabel(
    labelDescriptor:
      | LabelDescriptor
      | null
      | Observable<LabelDescriptor | null, unknown>,
  ) {
    get(membersMap, this).threadRowViewDriver.addLabel(labelDescriptor);
  }

  addImage(
    imageDescriptor: ImageDescriptor | Observable<ImageDescriptor | null, any>,
  ) {
    get(membersMap, this).threadRowViewDriver.addImage(imageDescriptor);
  }

  addButton(buttonDescriptor: any) {
    get(membersMap, this).threadRowViewDriver.addButton(buttonDescriptor);
  }

  addActionButton(actionButtonDescriptor: Record<string, any>) {
    get(membersMap, this).threadRowViewDriver.addActionButton(
      actionButtonDescriptor,
    );
  }

  addAttachmentIcon(threadRowAttachmentIconDescriptor: Record<string, any>) {
    get(membersMap, this).threadRowViewDriver.addAttachmentIcon(
      threadRowAttachmentIconDescriptor,
    );
  }

  replaceDate(
    threadRowDateDescriptor:
      | ThreadDateDescriptor
      | null
      | Observable<ThreadDateDescriptor | null, any>,
  ) {
    get(membersMap, this).threadRowViewDriver.replaceDate(
      threadRowDateDescriptor,
    );
  }

  replaceDraftLabel(
    draftLabelDescriptor:
      | DraftLabelDescriptor
      | null
      | Observable<DraftLabelDescriptor | null, any>,
  ) {
    get(membersMap, this).threadRowViewDriver.replaceDraftLabel(
      draftLabelDescriptor,
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

  /** @deprecated */
  getThreadID(): string {
    // TODO mark deprecated
    return get(membersMap, this).threadRowViewDriver.getThreadID();
  }

  getThreadIDAsync(): Promise<string> {
    return get(membersMap, this).threadRowViewDriver.getThreadIDAsync();
  }

  /** @deprecated */
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
