import type { Observable } from 'kefir';
import type { LabelDescriptor, ThreadDateDescriptor } from '../../inboxsdk';

export type ThreadRowViewDriver = {
  addLabel(label: LabelDescriptor | null): void;
  addButton(buttonDescriptor: Record<string, any>): void;
  addAttachmentIcon(opts: Record<string, any>): void;
  replaceDate(
    opts:
      | ThreadDateDescriptor
      | null
      | Observable<ThreadDateDescriptor | null, any>
  ): void;
  getSubject(): string;
  replaceSubject(newSubjectStr: string): void;
  getDateString(): string;
  getThreadID(): string;
};
