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

export interface GroupedImageDescriptor {
  imageUrl?: string;
  imageClass?: string;
  tooltip?: string;
}

export interface ImageDescriptor extends GroupedImageDescriptor {
  orderHint?: number;
}

export interface GroupedImagesDescriptor {
  group: GroupedImageDescriptor[];
  groupClass?: string;
  orderHint?: number;
}

type EmitterType = TypedEventEmitter<{ destroy: () => void }>;

const membersMap = new WeakMap<
  ThreadRowView,
  { threadRowViewDriver: GmailThreadRowView }
>();

export default class ThreadRowView extends (EventEmitter as new () => EmitterType) {
  /**
   * This property is set to true once the view is destroyed
   */
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

  addImageGroup(
    groupedImagesDescriptor:
      | GroupedImagesDescriptor
      | Observable<GroupedImagesDescriptor | null, any>,
  ) {
    get(membersMap, this).threadRowViewDriver.addImageGroup(
      groupedImagesDescriptor,
    );
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
    return get(membersMap, this).threadRowViewDriver.getThreadID();
  }

  getThreadIDAsync(): Promise<string> {
    return get(membersMap, this).threadRowViewDriver.getThreadIDAsync();
  }

  /** @deprecated */
  getThreadIDIfStable(): string | null {
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

  /**
   * @returns the {number} of visible draft messages in the row. This is purely an estimate based on what is visible in the row.
   */
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
