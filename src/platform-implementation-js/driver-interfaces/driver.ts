/* eslint-disable @typescript-eslint/no-unused-vars */
import type * as Kefir from 'kefir';
import type KeyboardShortcutHandle from '../views/keyboard-shortcut-handle';
import type Logger from '../lib/logger';
import type { ComposeViewDriver } from './compose-view-driver';
import type ComposeView from '../views/compose-view';
import type { RouteViewDriver } from './route-view-driver';
import type CommonPageCommunicator from '../lib/common-page-communicator';
// import type GmailBackdrop from '../dom-driver/gmail/views/gmail-backdrop';
import type InboxBackdrop from '../dom-driver/inbox/views/inbox-backdrop';
export type Backdrop = Record<string, any> | InboxBackdrop;
import type GmailThreadView from '../dom-driver/gmail/views/gmail-thread-view';
export type ThreadViewDriver = GmailThreadView;
import type { ThreadRowViewDriver } from './thread-row-view-driver';
import type { MoleViewDriver } from './mole-view-driver';
import type { MessageViewDriver } from './message-view-driver';
import type ContentPanelViewDriver from '../driver-common/sidebar/ContentPanelViewDriver';
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
// TODO fill in some of these any types
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
