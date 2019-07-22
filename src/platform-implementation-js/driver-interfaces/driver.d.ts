import * as Kefir from 'kefir';
import KeyboardShortcutHandle from '../views/keyboard-shortcut-handle';
import Logger from '../lib/logger';
import { ComposeViewDriver, Contact } from './compose-view-driver';
// import ComposeView from '../views/compose-view';
type ComposeView = any;
// import { RouteViewDriver } from './route-view-driver';
type RouteViewDriver = any;
import CommonPageCommunicator from '../lib/common-page-communicator';

// import GmailBackdrop from '../dom-driver/gmail/views/gmail-backdrop';
// import InboxBackdrop from '../dom-driver/inbox/views/inbox-backdrop';
// export type Backdrop = GmailBackdrop | InboxBackdrop;
export type Backdrop = any;

// import GmailThreadView from '../dom-driver/gmail/views/gmail-thread-view';
// import InboxThreadView from '../dom-driver/inbox/views/inbox-thread-view';
// export type ThreadViewDriver = GmailThreadView | InboxThreadView;
export type ThreadViewDriver = any;

// import { ThreadRowViewDriver } from './thread-row-view-driver';
type ThreadRowViewDriver = any;

// import { MoleViewDriver } from './mole-view-driver';
type MoleViewDriver = any;

// import { MessageViewDriver } from './message-view-driver';
type MessageViewDriver = any;
// import ContentPanelViewDriver from '../driver-common/sidebar/ContentPanelViewDriver';
type ContentPanelViewDriver = any;

// import GmailAttachmentCardView from '../dom-driver/gmail/views/gmail-attachment-card-view';
// import InboxAttachmentCardView from '../dom-driver/inbox/views/inbox-attachment-card-view';
// export type AttachmentCardViewDriver =
//   | GmailAttachmentCardView
//   | InboxAttachmentCardView;
export type AttachmentCardViewDriver = any;

export interface DrawerViewOptions {
  el: HTMLElement;
  title?: string;
  chrome?: boolean;
  composeView?: ComposeView;
  closeWithCompose?: boolean;
}
// import InboxDrawerView from '../dom-driver/inbox/views/inbox-drawer-view';
// export type DrawerViewDriver = InboxDrawerView;
export type DrawerViewDriver = any;

// import { PiOpts } from '../platform-implementation';
type PiOpts = any;

// TODO fill in some of these any types
export interface Driver {
  onready: Promise<void>;
  getLogger(): Logger;
  getAppId(): string;
  getOpts(): PiOpts;
  getRouteViewDriverStream(): Kefir.Observable<RouteViewDriver, any>; // should be a property
  getRowListViewDriverStream(): Kefir.Observable<any, any>;
  openNewComposeViewDriver(): Promise<ComposeViewDriver>;
  getNextComposeViewDriver(): Promise<ComposeViewDriver>;
  getComposeViewDriverStream(): Kefir.Observable<ComposeViewDriver, any>;
  openDraftByMessageID(messageID: string): void;
  getThreadViewDriverStream(): Kefir.Observable<ThreadViewDriver, any>;
  getMessageViewDriverStream(): Kefir.Observable<MessageViewDriver, any>;
  getAttachmentCardViewDriverStream(): Kefir.Observable<
    AttachmentCardViewDriver,
    any
  >;
  activateShortcut(
    keyboardShortcutHandle: KeyboardShortcutHandle,
    appName?: string,
    appIconUrl?: string
  ): void;
  getPageCommunicator(): CommonPageCommunicator;
  getGmailActionToken(): Promise<string>;
  getUserEmailAddress(): string;
  isConversationViewDisabled(): Promise<boolean>;
  isUsingMaterialUI(): boolean;
  getUserLanguage(): string;
  getUserContact(): Contact;
  getAccountSwitcherContactList(): Contact[];
  getThreadRowViewDriverStream(): Kefir.Observable<ThreadRowViewDriver, any>;
  registerThreadButton(options: any): () => void;
  addNavItem(appId: string, navItemDescriptor: any): any;
  getSentMailNativeNavItem(): Promise<any>;
  createLink(a: any, b: any): any;
  goto(routeID: string, params: any): Promise<void>;
  addCustomRouteID(routeID: string): () => void;
  addCustomListRouteID(routeID: string, handler: Function): () => void;
  showCustomRouteView(el: HTMLElement): void;
  setShowNativeNavMarker(isNative: boolean): any;
  setShowNativeAddonSidebar(isNative: boolean): any;
  registerSearchSuggestionsProvider(handler: Function): void;
  registerSearchQueryRewriter(obj: any): void;
  addToolbarButtonForApp(
    buttonDescriptor: Kefir.Observable<any, any>
  ): Promise<any>;
  addGlobalSidebarContentPanel(
    buttonDescriptor: Kefir.Observable<any, any>
  ): Promise<ContentPanelViewDriver | null | undefined>;
  getButterBarDriver(): ButterBarDriver;
  setButterBar(butterBar: any): void;
  isRunningInPageContext(): boolean;
  showAppIdWarning(): void;
  createModalViewDriver(options: any): any;
  createMoleViewDriver(options: any): MoleViewDriver;
  createTopMessageBarDriver(options: any): any;
  createDrawerViewDriver(options: DrawerViewOptions): DrawerViewDriver;
  createBackdrop(zIndex?: number, target?: HTMLElement): Backdrop;
  getStopper(): Kefir.Observable<null, never>;
  destroy(): void;

  getSelectedThreadRowViewDrivers(): ReadonlyArray<ThreadRowViewDriver>;
  registerThreadRowViewSelectionHandler(handler: () => any): () => void;
}

export interface ButterBarDriver {
  getNoticeAvailableStream(): Kefir.Observable<any, any>;
  getSharedMessageQueue(): any[];
  setSharedMessageQueue(queue: any[]): void;
  showMessage(rawOptions: any): ButterBarMessage;
  hideGmailMessage(): void;
}

export interface ButterBarMessage {
  destroy(): void;
}
