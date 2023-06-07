import type * as Kefir from 'kefir';
import type ComposeView from '../views/compose-view';
import type InboxBackdrop from '../dom-driver/inbox/views/inbox-backdrop';
export type Backdrop = InboxBackdrop;
import type GmailThreadView from '../dom-driver/gmail/views/gmail-thread-view';
export type ThreadViewDriver = GmailThreadView;
import type GmailAttachmentCardView from '../dom-driver/gmail/views/gmail-attachment-card-view';
export type AttachmentCardViewDriver = GmailAttachmentCardView;
export type DrawerViewOptions = {
  el: HTMLElement;
  title?: string;
  chrome?: boolean;
  composeView?: ComposeView;
  closeWithCompose?: boolean;
  matchSidebarContentPanelWidth?: boolean;
};
import type InboxDrawerView from '../dom-driver/inbox/views/inbox-drawer-view';
export type DrawerViewDriver = InboxDrawerView;
import GmailDriver from '../dom-driver/gmail/gmail-driver';
export type Driver = GmailDriver;
export type ButterBarDriver = {
  getNoticeAvailableStream(): Kefir.Observable<any, any>;
  getSharedMessageQueue(): any[];
  setSharedMessageQueue(queue: any[]): void;
  showMessage(rawOptions: any): ButterBarMessage;
  hideGmailMessage(): void;
};
export type ButterBarMessage = {
  destroy(): void;
};
