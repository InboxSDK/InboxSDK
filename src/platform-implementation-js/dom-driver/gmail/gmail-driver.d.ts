import * as Kefir from 'kefir';
import { TagTree } from 'tag-tree';
import {
  Driver,
  PiOpts,
  ContentPanelViewDriver,
  DrawerViewOptions,
  DrawerViewDriver
} from '../../driver-interfaces/driver';
import Logger from '../../lib/logger';
import GmailComposeView from './views/gmail-compose-view';
import KeyboardShortcutHandle from '../../views/keyboard-shortcut-handle';
import GmailPageCommunicator from './gmail-page-communicator';
import { Contact } from '../../driver-interfaces/compose-view-driver';
import GmailSupportItemView, {
  SupportItemDescriptor
} from './views/gmail-support-item-view';
type GmailRouteView = any;
type GmailThreadView = any;
type GmailMessageView = any;
type GmailAttachmentCardView = any;
type GmailButterBarDriver = any;
type GmailThreadRowView = any;
type GmailMoleViewDriver = any;
type GmailBackdrop = any;

export default class GmailDriver implements Driver {
  public onready: Promise<void>;
  public getLogger(): Logger;
  public getAppId(): string;
  public getOpts(): PiOpts;
  public getRouteViewDriverStream(): Kefir.Observable<GmailRouteView, any>; // should be a property
  public getRowListViewDriverStream(): Kefir.Observable<any, any>;
  public openNewComposeViewDriver(): Promise<GmailComposeView>;
  public getNextComposeViewDriver(): Promise<GmailComposeView>;
  public getComposeViewDriverStream(): Kefir.Observable<GmailComposeView, any>;
  public openDraftByMessageID(messageID: string): void;
  public getThreadViewDriverStream(): Kefir.Observable<GmailThreadView, any>;
  public getMessageViewDriverStream(): Kefir.Observable<GmailMessageView, any>;
  public getAttachmentCardViewDriverStream(): Kefir.Observable<
    GmailAttachmentCardView,
    any
  >;
  public activateShortcut(
    keyboardShortcutHandle: KeyboardShortcutHandle,
    appName?: string,
    appIconUrl?: string
  ): void;
  public getTagTree(): TagTree<HTMLElement>;
  public getPageCommunicator(): GmailPageCommunicator;
  public getGmailActionToken(): Promise<string>;
  public getUserEmailAddress(): string;
  public isConversationViewDisabled(): Promise<boolean>;
  public getUserLanguage(): string;
  public getUserContact(): Contact;
  public getAccountSwitcherContactList(): Contact[];
  public getThreadRowViewDriverStream(): Kefir.Observable<
    GmailThreadRowView,
    any
  >;
  public registerThreadButton(options: any): () => void;
  public addNavItem(appId: string, navItemDescriptor: any): any;
  public addSupportItem(
    supportItemDescriptor: SupportItemDescriptor
  ): GmailSupportItemView;
  public getSentMailNativeNavItem(): Promise<any>;
  public createLink(a: any, b: any): any;
  public goto(routeID: string, params: any): Promise<void>;
  public addCustomRouteID(routeID: string): () => void;
  public addCustomListRouteID(routeID: string, handler: Function): () => void;
  public showCustomRouteView(el: HTMLElement): void;
  public setShowNativeNavMarker(isNative: boolean): any;
  public setShowNativeAddonSidebar(isNative: boolean): any;
  public registerSearchSuggestionsProvider(handler: Function): void;
  public registerSearchQueryRewriter(obj: any): void;
  public addToolbarButtonForApp(
    buttonDescriptor: Kefir.Observable<any, any>
  ): Promise<any>;
  public addGlobalSidebarContentPanel(
    buttonDescriptor: Kefir.Observable<any, any>
  ): Promise<ContentPanelViewDriver | null | undefined>;
  public getButterBarDriver(): GmailButterBarDriver;
  public setButterBar(butterBar: any): void;
  public isRunningInPageContext(): boolean;
  public showAppIdWarning(): void;
  public createModalViewDriver(options: any): any;
  public createMoleViewDriver(options: any): GmailMoleViewDriver;
  public createTopMessageBarDriver(options: any): any;
  public createDrawerViewDriver(options: DrawerViewOptions): DrawerViewDriver;
  public createBackdrop(zIndex?: number, target?: HTMLElement): GmailBackdrop;
  public getStopper(): Kefir.Observable<null, never>;
  public destroy(): void;

  public getSelectedThreadRowViewDrivers(): ReadonlyArray<GmailThreadRowView>;
  public registerThreadRowViewSelectionHandler(handler: () => any): () => void;
}
