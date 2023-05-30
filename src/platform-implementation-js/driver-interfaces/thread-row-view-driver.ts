export type ThreadRowViewDriver = {
  addLabel(label: Record<string, any>): void;
  addButton(buttonDescriptor: Record<string, any>): void;
  addAttachmentIcon(opts: Record<string, any>): void;
  replaceDate(opts: Record<string, any>): void;
  getSubject(): string;
  replaceSubject(newSubjectStr: string): void;
  getDateString(): string;
  getThreadID(): string;
};
