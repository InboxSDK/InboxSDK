import { EventEmitter } from 'events';
import * as Kefir from 'kefir';
import TypedEmitter from 'typed-emitter';
import AppMenu from './platform-implementation-js/namespaces/app-menu';
import {
  NavItemTypes,
  NavItemDescriptor,
} from './platform-implementation-js/dom-driver/gmail/views/gmail-nav-item-view';
import NavItemView from './platform-implementation-js/views/nav-item-view';
import type { Stopper } from 'kefir-stopper';
import GmailRouteProcessor from './platform-implementation-js/dom-driver/gmail/views/gmail-route-view/gmail-route-processor';
import GmailDriver from './platform-implementation-js/dom-driver/gmail/gmail-driver';
import GmailRowListView from './platform-implementation-js/dom-driver/gmail/views/gmail-row-list-view';
import type { AppLogger } from './platform-implementation-js/lib/logger';
import type { IThreadRowView as ThreadRowView } from './platform-implementation-js/views/thread-row-view';
export * from './platform-implementation-js/dom-driver/gmail/views/gmail-nav-item-view';

export const LOADER_VERSION: string;
export interface LoadScriptOptions {
  // By default, the script is executed within a function, so that top-level
  // variables defined in it don't become global variables. Setting nowrap to
  // true disables this behavior.
  nowrap?: boolean;
  disableSourceMappingURL?: boolean;
  XMLHttpRequest?: typeof XMLHttpRequest;
}
export function loadScript(
  url: string,
  opts?: LoadScriptOptions
): Promise<void>;
export function load(
  version: number,
  appId: string,
  opts: any
): Promise<InboxSDK>;

// types

export interface InboxSDK {
  Conversations: Conversations;
  Compose: Compose;
  ButterBar: ButterBar;
  Lists: Lists;
  Logger: AppLogger;
  NavMenu: NavMenu;
  AppMenu: AppMenu;
  Router: Router;
  Widgets: Widgets;
  Toolbars: Toolbars;
  User: User;
  Keyboard: Keyboard;
  Search: Search;
  Global: Global;
}

export interface Global {
  addSidebarContentPanel(
    contentPanelDescriptor: ContentPanelDescriptor
  ): Promise<ContentPanelView | null>;
  addSupportItem(
    supportItemDescriptor: SupportItemDescriptor
  ): GmailSupportItemView;
}

export interface GmailSupportItemView {
  destroy(): void;
}

export interface SupportItemDescriptor {
  element: HTMLElement;
  onClick(): void;
}
export interface Conversations {
  registerThreadViewHandler(
    callback: (threadView: ThreadView) => void
  ): () => void;
  registerMessageViewHandler(
    callback: (messageView: MessageView) => void
  ): () => void;
}

export interface Compose {
  openDraftByMessageID(messageId: string): Promise<ComposeView>;
  openNewComposeView(): Promise<ComposeView>;
  registerComposeViewHandler(handler: (composeView: ComposeView) => void): void;
}

export interface ButterBar {
  showMessage(messageDescriptor: MessageDescriptor): { destroy: () => void };
  showLoading(messageDescriptor: LoadingMessageDescriptor): {
    destroy: () => void;
  };
  showError(messageDescriptor: MessageDescriptor): { destroy: () => void };
  showSaving(messageDescriptor: SavingMessageDescriptor): {
    resolve: () => void;
    reject: () => void;
    promise: Promise<any>;
  };
  hideMessage(messageKey: Record<string, any> | string): void;
  hideGmailMessage(): void;
}

// todo:
// export interface CreateAccessoryDescriptor {}
// export interface IconButtonAccessoryDescriptor {}
// export interface DropdownButtonAccessoryDescriptor {}

export { AppMenu };
export type { AppMenuItemView } from './platform-implementation-js/views/app-menu-item-view';
export type { AppMenuItemPanelDescriptor } from './platform-implementation-js/namespaces/app-menu';
export type { CollapsiblePanelView } from './platform-implementation-js/views/collapsible-panel-view';

export interface NativeNavItemView extends EventEmitter {
  addNavItem(descriptor: NavItemDescriptor): NavItemView;
  setCollapsed(collapseState: boolean): void;
  isCollapsed(): boolean;
}

export interface NavMenu {
  SENT_MAIL: NativeNavItemView;
  NavItemTypes: NavItemTypes;
  addNavItem(
    descriptor: NavItemDescriptor | Kefir.Observable<NavItemDescriptor, any>
  ): NavItemView;
}

export interface Router {
  createLink(routeID: string, params?: any): string;
  getCurrentRouteView(): RouteView;
  goto(routeID: string, params?: any): Promise<void>;
  handleAllRoutes(handler: (routeView: RouteView) => void): () => void;
  handleCustomRoute(
    routeID: string,
    handler: (customRouteView: CustomRouteView) => void
  ): () => void;
  handleCustomListRoute(
    routeID: string,
    handler: (offset: number, max: number) => void
  ): void;
  handleListRoute(
    routeID: string,
    handler: (listRouteView: ListRouteView) => void
  ): () => void;
  NativeRouteIDs: Record<NativeRouteIdTypes, string>;
  NativeListRouteIDs: Record<
    | 'ALL_MAIL'
    | 'ANY_LIST'
    | 'DRAFTS'
    | 'IMPORTANT'
    | 'INBOX'
    | 'LABEL'
    | 'SEARCH'
    | 'SEARCH'
    | 'SENT'
    | 'SPAM'
    | 'STARRED'
    | 'TRASH',
    string
  >;
  RouteTypes: Record<RouteTypes, string>;
}

type NativeRouteIdTypes =
  | 'INBOX'
  | 'ALL_MAIL'
  | 'SENT'
  | 'STARRED'
  | 'DRAFTS'
  | 'SNOOZED'
  | 'DONE'
  | 'REMINDERS'
  | 'LABEL'
  | 'TRASH'
  | 'SPAM'
  | 'IMPORTANT'
  | 'SEARCH'
  | 'THREAD'
  | 'CHATS'
  | 'CHAT'
  | 'CONTACTS'
  | 'CONTACT'
  | 'SETTINGS'
  | 'ANY_LIST';

type RouteTypes =
  | 'CHAT'
  | 'CUSTOM'
  | 'LIST'
  | 'SETTINGS'
  | 'THREAD'
  | 'UNKNOWN';

export interface Widgets {
  /** check whether mole view has light title bar as part of gmail new view / original view  */
  isMoleViewTitleBarLightColor(): boolean;
  showModalView(descriptor: ModalDescriptor): ModalView;
  showMoleView(descriptor: MoleDescriptor): MoleView;
  showDrawerView(descriptor: DrawerDescriptor): DrawerView;
  showTopMessageBarView(opts: { el: Element }): Element;
}

export interface Toolbars {
  addToolbarButtonForApp(
    descriptor:
      | AppToolbarButtonDescriptor
      | Kefir.Stream<AppToolbarButtonDescriptor, any>
  ): AppToolbarButtonView;
  registerThreadButton(descriptor: ToolbarButtonDescriptor): () => void;
  registerToolbarButtonForThreadView(
    descriptor: LegacyToolbarButtonDescriptor
  ): () => void;
  SectionNames: {
    INBOX_STATE: 'INBOX_STATE';
    METADATA_STATE: 'METADATA_STATE';
    OTHER: 'OTHER';
  };
}

export interface AppToolbarButtonDescriptor {
  title: string;
  titleClass?: string;
  iconUrl: string;
  iconClass?: string;
  onClick: (e: MouseEvent) => void;
  arrowColor?: string | null;
}

export type AppToolbarButtonView = {
  open(): void;
  close(): void;
  remove(): void;
} & TypedEmitter<{ destroy: () => void }>;

export interface Keyboard {
  createShortcutHandle(
    descriptor: KeyboardShortcutDescriptor
  ): KeyboardShortcutHandle;
}

export interface Search {
  registerSearchSuggestionsProvider(
    handler: (
      query: string
    ) =>
      | Array<AutocompleteSearchResult>
      | Promise<Array<AutocompleteSearchResult>>
  ): void;
  registerSearchQueryRewriter(rewriter: SearchQueryRewriter): void;
}

export interface Lists {
  registerThreadRowViewHandler(
    handler: (threadRowView: ThreadRowView) => void
  ): () => void;
  getSelectedThreadRowViews(): ThreadRowView[];
  registerThreadRowViewSelectionHandler(handler: () => void): () => void;
}

export interface User {
  /** @deprecated */
  getAccountSwitcherContactList(): Contact[];
  getEmailAddress(): string;
  getLanguage(): string;
  isConversationViewDisabled(): Promise<boolean>;
}

export {
  IThreadRowView as ThreadRowView,
  ImageDescriptor,
} from './platform-implementation-js/views/thread-row-view';

export interface ThreadDateDescriptor {
  text: string;
  tooltip?: string;
  textColor?: string;
}

export interface DraftLabelDescriptor {
  text: string;
  count?: string | number;
}

export interface LabelDescriptor {
  title?: string;
  titleHtml?: string;
  iconUrl?: string;
  iconClass?: string;
  iconHtml?: string;
  foregroundColor?: string;
  backgroundColor?: string;
  maxWidth?: string;
}

export interface ThreadRowAttachmentIconDescriptor {
  iconUrl?: string;
  iconClass?: string;
  tooltip?: string;
}

export { NavItemView };

export interface SectionView extends EventEmitter {
  remove(): void;
}

export interface CollapsibleSectionView extends SectionView {
  setCollapsed(value: boolean): void;
}

export class RouteView extends EventEmitter {
  constructor(
    options: any,
    gmailRouteProcessor: GmailRouteProcessor,
    driver: GmailDriver
  );
  destroy(): void;
  getEventStream(): Kefir.Observable<any, any>;
  getRouteID(): string | null;
  getRouteType(): string;
  getRowListViews(): GmailRowListView[];
  getParams(): { [key: string]: string };
  getStopper(): Stopper;
  isCustomRouteBelongingToApp(): boolean;
}

export interface ListRouteView extends RouteView {
  addCollapsibleSection(options: any): CollapsibleSectionView;
  addSection(options: any): SectionView;
  refresh(): void;
}

export interface CustomRouteView extends RouteView {
  getElement(): HTMLElement;
}

export interface CustomListDescriptor {
  hasMore?: boolean;
  threads: string | Array<ThreadDescriptor>;
  total?: number;
}

export interface ThreadDescriptor {
  gmailThreadId?: string;
  rfcMessageId?: string;
}

export interface ModalDescriptor {
  el: HTMLElement;
  chrome?: boolean;
  constrainTitleWidth?: boolean;
  showCloseButton?: boolean;
  title?: string;
  buttons?: Array<ModalButtonDescriptor>;
}

export interface ModalButtonDescriptor {
  text: string;
  title?: string;
  onClick(event: { modalView: ModalView }): any;
  type?: 'PRIMARY_ACTION' | 'SECONDARY_ACTION';
  orderHint?: number;
}

export interface ModalView extends EventEmitter {
  close(): void;
  setTitle(s: string): void;
}

export interface DrawerView extends EventEmitter {
  close(): void;
  associateComposeView(
    composeView: ComposeView,
    closeWithCompose?: boolean
  ): void;
  disassociateComposeView(): void;
}

export interface DrawerDescriptor {
  el: HTMLElement;
  chrome?: boolean;
  title?: string;
  composeView?: ComposeView;
  closeWithCompose?: boolean;
  matchSidebarContentPanelWidth?: boolean;
}

export interface MoleDescriptor {
  el: HTMLElement;
  title?: string;
  titleEl?: HTMLElement;
  minimizedTitleEl?: HTMLElement;
  className?: string;
  titleButtons?: Array<ButtonDescriptor>;
  chrome?: boolean;
}

export interface ButtonDescriptor {
  title?: string;
  iconUrl?: string;
  iconClass?: string;
  hasDropdown?: boolean;
  onClick(e: MouseEvent): void;
  activateFunction?: (e: Event) => void;
  buttonColor?: string;
  dropdownShowFunction?: (e: Event) => void;
  noArrow?: boolean;
  tooltip?: string;
  type?: string;
}

export interface MoleView extends EventEmitter {
  close(): void;
  getMinimized(): boolean;
  setMinimized(value: boolean): void;
  setTitle(title: string): void;
}

export interface SimpleElementView extends EventEmitter {
  el: HTMLElement;
  destroyed: boolean;
  destroy(): void;
}

export interface ThreadView extends EventEmitter {
  addLabel(): SimpleElementView;
  addSidebarContentPanel(
    contentPanelDescriptor: ContentPanelDescriptor
  ): ContentPanelView;
  getMessageViews(): Array<MessageView>;
  getMessageViewsAll(): Array<MessageView>;
  getSubject(): string;
  /**
   * @deprecated
   */
  getThreadID(): string;
  getThreadIDAsync(): Promise<string>;
  addNoticeBar(): SimpleElementView;
}

export interface UNSTABLE_ThreadView extends ThreadView {
  //#region Undocumented methods
  /**
   * @internal
   */
  addCustomMessage: (descriptor: {
    collapsedEl: HTMLElement;
    headerEl: HTMLElement;
    bodyEl: HTMLElement;
    iconUrl: string;
    sortDate: Date;
  }) => CustomMessageView;
  /**
   * @internal
   */
  registerHiddenCustomMessageNoticeProvider: (
    provider: (
      numCustomHidden: number,
      numberNativeHidden: number,
      unmountPromise: Promise<void>
    ) => HTMLElement | null
  ) => void;
  //#endregion
}

export interface CustomMessageView extends EventEmitter {
  destroy(): void;
  expand(): void;
  collapse(): void;
  getElement(): HTMLElement;
  getSortDate(): Date | null;
}

export interface ContentPanelView extends EventEmitter {
  close(): void;
  isActive(): boolean;
  open(): void;
  remove(): void;
}

export interface ContentPanelDescriptor {
  appName?: string;
  el: HTMLElement;
  id: string;
  title: string;
  iconUrl?: string;
  iconClass?: string;
  orderHint?: number;
}

export interface MessageAttachmentIconDescriptor {
  iconUrl?: string;
  iconClass?: string;
  iconHtml?: string | null;
  tooltip: string | HTMLElement;
  onClick: () => void;
}

export type AttachmentIcon = TypedEmitter<{
  tooltipHidden: () => void;
  tooltipShown: () => void;
}>;

export type MessageViewToolbarSectionNames = 'MORE';

export interface MessageViewToolbarButtonDescriptor {
  section: MessageViewToolbarSectionNames;
  title: string;
  iconUrl?: string;
  iconClass?: string;
  onClick: (e: MouseEvent) => void;
  orderHint?: number;
}

export interface MessageView extends EventEmitter {
  addAttachmentIcon(
    opts:
      | MessageAttachmentIconDescriptor
      | Kefir.Stream<MessageAttachmentIconDescriptor, never>
  ): AttachmentIcon;
  addToolbarButton(opts?: MessageViewToolbarButtonDescriptor): void;
  getBodyElement(): HTMLElement;
  isElementInQuotedArea(element: HTMLElement): boolean;
  isLoaded(): boolean;
  getSender(): Contact;
  getRecipients(): Array<Contact>;
  getRecipientsFull(): Promise<Array<Contact>>;
  getLinksInBody(): Array<MessageViewLinkDescriptor>;
  getThreadView(): ThreadView;
  getMessageIDAsync(): Promise<string>;
}

export interface Contact {
  name: string;
  emailAddress: string;
}

export interface MessageViewLinkDescriptor {
  text: string;
  html: string;
  element: HTMLElement;
  href: string;
  isInQuotedArea: boolean;
}

export interface ToolbarButtonDescriptor {
  title: string;
  iconUrl?: string;
  iconClass?: string;
  positions?: Array<'THREAD' | 'ROW' | 'LIST'> | null;
  threadSection?: string;
  listSection?: string;
  onClick(event: ToolbarButtonOnClickEvent): void;
  hasDropdown: boolean;
  hideFor?: (routeView: RouteView) => boolean;
  keyboardShortcutHandle?: KeyboardShortcutHandle;
  orderHint?: number;
}

export interface LegacyToolbarButtonDescriptor {
  title: string;
  iconUrl?: string;
  iconClass?: string;
  section: 'INBOX_STATE' | 'METADATA_STATE' | 'OTHER';
  onClick(event: ToolbarButtonOnClickEvent): void;
  hasDropdown?: boolean;
  hideFor?: (routeView: RouteView) => boolean;
  keyboardShortcutHandle?: KeyboardShortcutHandle;
  orderHint?: number;
}

export interface ToolbarButtonOnClickEvent {
  selectedThreadViews: Array<ThreadView>;
  selectedThreadRowViews: Array<ThreadRowView>;
  dropdown?: DropdownView;
  threadView?: ThreadView;
}

export interface KeyboardShortcutDescriptor {
  chord: string;
  description: string;
}

export interface KeyboardShortcutHandle {
  remove(): void;
}

export interface DropdownView extends EventEmitter {
  close(): void;
  el: HTMLElement;
  destroyed: boolean;
  reposition(): void;
}

export interface ComposeView extends EventEmitter {
  destroyed: boolean;
  addButton(
    buttonOptions:
      | ComposeButtonDescriptor
      | Kefir.Observable<ComposeButtonDescriptor, any>
  ): void;
  addComposeNotice(): ComposeNoticeView;
  addRecipientRow(
    RecipientRowOptions:
      | RecipientRowOptions
      | Kefir.Observable<RecipientRowOptions, any>
  ): { destroy(): void };
  addStatusBar(statusBarDescriptor: StatusBarDescriptor): StatusBarView;
  close(): void;
  ensureAppButtonToolbarsAreClosed(): void;
  ensureFormattingToolbarIsHidden(): void;
  forceRecipientRowsOpen(): () => void;
  getBccRecipients(): Array<Contact>;
  getBodyElement(): HTMLElement;
  getCcRecipients(): Array<Contact>;
  getCurrentDraftID(): Promise<string | null>;
  getElement(): HTMLElement;
  getDraftID(): Promise<string | null>;
  getMessageIDAsync(): Promise<string>;
  getSubject(): string;
  getSubjectInput(): HTMLInputElement | null;
  getThreadID(): string;
  getToRecipients(): Array<Contact>;
  getHTMLContent(): string;
  getTextContent(): string;
  hideDiscardButton(): () => void;
  hideNativeRecipientRows(): () => void;
  isMinimized(): boolean;
  setMinimized(minimized: boolean): void;
  isFullscreen(): boolean;
  insertHTMLIntoBodyAtCursor(html: string): HTMLElement;
  isForward(): boolean;
  isInlineReplyForm(): boolean;
  isReply(): boolean;
  overrideEditSubject(): void;
  registerRequestModifier(
    cb: (composeParams: { isPlainText?: boolean; body: string }) => void
  ): void;
  replaceSendButton({ el }: { el: HTMLElement }): () => void;
  setBccRecipients(emails: string[]): void;
  setBodyHTML(html: string): void;
  setBodyText(to: string): void;
  setCcRecipients(emails: string[]): void;
  setFullscreen(isFullscreen: boolean): void;
  setSubject(subject: string): void;
  setTitleBarColor(color: string): () => void;
  setTitleBarText(to: string): () => void;
  setToRecipients(recipients: string[]): void;
  send(options?: SendOptions): void;
  getFromContact(): Contact;
  getFromContactChoices(): Contact[];
}

export interface SendOptions {
  sendAndArchive?: boolean;
}

export interface ComposeViewDestroyEvent {
  messageID: string | null;
  closedByInboxSDK: boolean;
}

export interface ComposeButtonDescriptor {
  title: string;
  iconUrl?: string;
  iconClass?: string;
  onClick(event: ComposeViewButtonOnClickEvent): void;
  hasDropdown?: boolean;
  type?: 'SEND_ACTION' | 'MODIFIER';
  orderHint?: number;
  enabled?: boolean;
  noOverflow?: boolean;
  tooltip?: string | null;
}

export interface ComposeViewButtonOnClickEvent {
  composeView: ComposeView;
  dropdown: DropdownView;
}

export interface RecipientRowOptions {
  el?: HTMLElement;
  labelClass?: string;
  labelText?: string;
  labelTextClass?: string;
}

export interface AutocompleteSearchResult {
  name?: null | string;
  nameHTML?: null | string;
  description?: null | string;
  descriptionHTML?: null | string;
  routeName?: null | string;
  routeParams?: null | { [ix: string]: string | number };
  externalURL?: null | string;
  searchTerm?: null | string;
  iconUrl?: null | string;
  iconClass?: null | string;
  iconHTML?: null | string;
  onClick?: null | (() => void);
}

export interface StatusBarDescriptor {
  addAboveNativeStatusBar?: boolean;
  height?: number;
  orderHint?: number;
}

export interface StatusBarView extends SimpleElementView {
  setHeight(newHeight: number): any;
}

export type ComposeNoticeView = SimpleElementView;

export interface MessageButtonDescriptor {
  onClick(): void;
  title: string;
}

export interface MessageDescriptor {
  buttons?: Array<MessageButtonDescriptor>;
  className?: string;
  el?: string;
  hideOnViewChanged?: boolean;
  html?: string;
  messageKey?: Record<string, any> | string;
  persistent?: boolean;
  priority?: number;
  text?: string;
  time?: number;
}

export interface LoadingMessageDescriptor {
  className?: string;
  el?: string;
  hideOnViewChanged?: boolean;
  html?: string;
  messageKey?: Record<string, any>;
  persistent?: boolean;
  priority?: number;
  text?: string;
}

export interface SavingMessageDescriptor {
  className?: string;
  confirmationText?: string;
  confirmationTime?: number;
  el?: string;
  hideOnViewChanged?: boolean;
  html?: string;
  messageKey?: Record<string, any> | string;
  persistent?: boolean;
  priority?: number;
  showConfirmation?: boolean;
  text?: string;
  time?: number;
}

export interface SearchQueryRewriter {
  term: string;
  termReplacer(): string | Promise<string>;
}
