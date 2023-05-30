import type Kefir from 'kefir';
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
import type { PiOpts } from '../platform-implementation';
import type GmailSupportItemView, {
  SupportItemDescriptor,
} from '../dom-driver/gmail/views/gmail-support-item-view';
import type GmailNavItemView from '../dom-driver/gmail/views/gmail-nav-item-view';
import type GmailAppMenuItemView from '../dom-driver/gmail/views/gmail-app-menu-item-view';
// TODO fill in some of these any types
export type Driver = {
  onready: Promise<void>;
  getLogger(): Logger;
  getAppId(): string;
  getOpts(): PiOpts;
  getRouteViewDriverStream(): Kefir.Observable<RouteViewDriver>;
  // should be a property
  getRowListViewDriverStream(): Kefir.Observable<Record<string, any>>;
  openNewComposeViewDriver(): Promise<ComposeViewDriver>;
  getNextComposeViewDriver(): Promise<ComposeViewDriver>;
  getComposeViewDriverStream(): Kefir.Observable<ComposeViewDriver>;
  openDraftByMessageID(messageID: string): Promise<void>;
  getThreadViewDriverStream(): Kefir.Observable<ThreadViewDriver>;
  getMessageViewDriverStream(): Kefir.Observable<MessageViewDriver>;
  getAttachmentCardViewDriverStream(): Kefir.Observable<AttachmentCardViewDriver>;
  activateShortcut(
    keyboardShortcutHandle: KeyboardShortcutHandle,
    appName: string | null | undefined,
    appIconUrl: string | null | undefined
  ): void;
  getPageCommunicator(): CommonPageCommunicator;
  getGmailActionToken(): Promise<string>;
  getUserEmailAddress(): string;
  isConversationViewDisabled(): Promise<boolean>;
  getUserLanguage(): string;
  getUserContact(): Contact;
  getAccountSwitcherContactList(): Contact[];
  getThreadRowViewDriverStream(): Kefir.Observable<ThreadRowViewDriver>;
  registerThreadButton(options: Record<string, any>): () => void;
  addNavItem(
    appId: string,
    navItemDescriptor: Record<string, any>
  ): Promise<GmailNavItemView>;
  addAppMenuItem(
    appId: string,
    menuItemDescriptor: Record<string, any>
  ): Promise<GmailAppMenuItemView>;
  addSupportItem(
    supportItemDescriptor: SupportItemDescriptor
  ): GmailSupportItemView;
  getSentMailNativeNavItem(): Promise<Record<string, any>>;
  createLink(a: any, b: any): any;
  goto(routeID: string, params: any): Promise<void>;
  addCustomRouteID(routeID: string): () => void;
  addCustomListRouteID(
    routeID: string,
    handler: (...args: Array<any>) => any
  ): () => void;
  showCustomRouteView(el: HTMLElement): void;
  setShowNativeNavMarker(isNative: boolean): any;
  setShowNativeAddonSidebar(isNative: boolean): any;
  registerSearchSuggestionsProvider(
    handler: (...args: Array<any>) => any
  ): void;
  registerSearchQueryRewriter(obj: Record<string, any>): void;
  addToolbarButtonForApp(
    buttonDescriptor: Kefir.Observable<Record<string, any>>
  ): Promise<Record<string, any>>;
  addGlobalSidebarContentPanel(
    buttonDescriptor: Kefir.Observable<Record<string, any>>
  ): Promise<ContentPanelViewDriver | null | undefined>;
  getButterBarDriver(): any;
  setButterBar(butterBar: any): void;
  isRunningInPageContext(): boolean;
  showAppIdWarning(): void;
  createModalViewDriver(options: Record<string, any>): Record<string, any>;
  createMoleViewDriver(options: Record<string, any>): MoleViewDriver;
  createTopMessageBarDriver(options: Record<string, any>): Record<string, any>;
  createDrawerViewDriver(options: DrawerViewOptions): DrawerViewDriver;
  createBackdrop(zIndex?: number, target?: HTMLElement): Backdrop;
  getStopper(): Kefir.Observable<any>;
  destroy(): void;
  getSelectedThreadRowViewDrivers(): ReadonlyArray<ThreadRowViewDriver>;
  registerThreadRowViewSelectionHandler(handler: () => any): () => void;
};
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
