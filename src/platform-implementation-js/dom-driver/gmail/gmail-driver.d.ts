import * as Kefir from 'kefir';
import { TagTree } from 'tag-tree';
import {
  Driver,
  PiOpts,
  ContentPanelViewDriver,
  DrawerViewOptions,
  DrawerViewDriver,
} from '../../driver-interfaces/driver';
import Logger from '../../lib/logger';
import GmailComposeView from './views/gmail-compose-view';
import KeyboardShortcutHandle from '../../views/keyboard-shortcut-handle';
import GmailPageCommunicator from './gmail-page-communicator';
import { Contact } from '../../driver-interfaces/compose-view-driver';
import GmailSupportItemView, {
  SupportItemDescriptor,
} from './views/gmail-support-item-view';
import { AppMenuItemDescriptor } from '../../namespaces/app-menu';
import { GmailAppMenuItemView } from './views/gmail-app-menu-item-view';
import { RouteView } from '../../../inboxsdk';
import { EnvData } from '../../platform-implementation';

type GmailThreadView = any;
type GmailMessageView = any;
type GmailAttachmentCardView = any;
type GmailButterBarDriver = any;
type GmailThreadRowView = any;
type GmailMoleViewDriver = any;
type GmailBackdrop = any;

export default class GmailDriver implements Driver {
  getEnvData(): EnvData;
  getTimings(): { [ix: string]: number | undefined | null };
  onready: Promise<void>;
  isUsingSyncAPI(): boolean;
  getLogger(): Logger;
  getAppId(): string;
  getOpts(): PiOpts;
  getRouteViewDriverStream(): Kefir.Observable<RouteView, any>; // should be a property
  getRowListViewDriverStream(): Kefir.Observable<any, any>;
  openNewComposeViewDriver(): Promise<GmailComposeView>;
  getNextComposeViewDriver(): Promise<GmailComposeView>;
  getComposeViewDriverStream(): Kefir.Observable<GmailComposeView, any>;
  openDraftByMessageID(messageID: string): Promise<void>;
  getThreadViewDriverStream(): Kefir.Observable<GmailThreadView, any>;
  getMessageViewDriverStream(): Kefir.Observable<GmailMessageView, any>;
  getAttachmentCardViewDriverStream(): Kefir.Observable<
    GmailAttachmentCardView,
    any
  >;
  activateShortcut(
    keyboardShortcutHandle: KeyboardShortcutHandle,
    appName?: string,
    appIconUrl?: string
  ): void;
  getTagTree(): TagTree<HTMLElement>;
  getPageCommunicator(): GmailPageCommunicator;
  getGmailActionToken(): Promise<string>;
  getUserEmailAddress(): string;
  isConversationViewDisabled(): Promise<boolean>;
  getUserLanguage(): string;
  getUserContact(): Contact;
  getAccountSwitcherContactList(): Contact[];
  getThreadRowViewDriverStream(): Kefir.Observable<GmailThreadRowView, any>;
  registerThreadButton(options: any): () => void;
  addNavItem(
    appId: string,
    navItemDescriptor: any,
    navMenuInjectionContainer?: HTMLElement
  ): any;
  addAppMenuItem(
    menuItemDescriptor: AppMenuItemDescriptor
  ): Promise<GmailAppMenuItemView>;
  addSupportItem(
    supportItemDescriptor: SupportItemDescriptor
  ): GmailSupportItemView;
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
  getButterBarDriver(): GmailButterBarDriver;
  setButterBar(butterBar: any): void;
  isRunningInPageContext(): boolean;
  showAppIdWarning(): void;
  createModalViewDriver(options: any): any;
  createMoleViewDriver(options: any): GmailMoleViewDriver;
  createTopMessageBarDriver(options: any): any;
  createDrawerViewDriver(options: DrawerViewOptions): DrawerViewDriver;
  createBackdrop(zIndex?: number, target?: HTMLElement): GmailBackdrop;
  getStopper(): Kefir.Observable<null, never>;
  destroy(): void;

  getSelectedThreadRowViewDrivers(): ReadonlyArray<GmailThreadRowView>;
  registerThreadRowViewSelectionHandler(handler: () => any): () => void;
  getLoadEventDetails(): any;
}
