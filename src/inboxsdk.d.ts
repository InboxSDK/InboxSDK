import { EventEmitter } from 'events';
import type * as Kefir from 'kefir';
import type TypedEmitter from 'typed-emitter';
import AppMenu from './platform-implementation-js/namespaces/app-menu';
import type Global from './platform-implementation-js/namespaces/global';
import type {
  NavItemTypes,
  NavItemDescriptor,
} from './platform-implementation-js/dom-driver/gmail/views/gmail-nav-item-view';
import NavItemView from './platform-implementation-js/views/nav-item-view';
import type { Stopper } from 'kefir-stopper';
import type GmailRouteProcessor from './platform-implementation-js/dom-driver/gmail/views/gmail-route-view/gmail-route-processor';
import type GmailDriver from './platform-implementation-js/dom-driver/gmail/gmail-driver';
import type GmailRowListView from './platform-implementation-js/dom-driver/gmail/views/gmail-row-list-view';
import type { AppLogger } from './platform-implementation-js/lib/logger';
import type { IThreadRowView as ThreadRowView } from './platform-implementation-js/views/thread-row-view';
import TypedEventEmitter from 'typed-emitter';
import { MessageViewEvent } from './platform-implementation-js/views/conversations/message-view';
import type { ThreadViewEvents } from './platform-implementation-js/views/conversations/thread-view';
import type { ComposeViewEvent } from './platform-implementation-js/views/compose-view';
import type AttachmentCardView from './platform-implementation-js/views/conversations/attachment-card-view';
import type TopMessageBarView from './platform-implementation-js/widgets/top-message-bar-view';
import type { IMoleView as MoleView } from './platform-implementation-js/widgets/mole-view';
export * from './platform-implementation-js/dom-driver/gmail/views/gmail-nav-item-view';
import type User from './platform-implementation-js/namespaces/user';
import { ContentPanelDescriptor } from './platform-implementation-js/driver-common/sidebar/ContentPanelViewDriver';
import type ContentPanelView from './platform-implementation-js/views/content-panel-view';
import type { MoleOptions } from './platform-implementation-js/dom-driver/gmail/widgets/gmail-mole-view-driver';
import type { ComposeButtonDescriptor } from './platform-implementation-js/driver-interfaces/compose-view-driver';
import type ComposeView from './platform-implementation-js/views/compose-view';
import type Search from './platform-implementation-js/namespaces/search';
import type {
  default as Toolbars,
  LegacyToolbarButtonDescriptor,
} from './platform-implementation-js/namespaces/toolbars';

export type { User };

export const LOADER_VERSION: string;

export function load(
  version: number,
  appId: string,
  opts: any,
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

export { type ContentPanelDescriptor };
export { type Global };

export interface GmailSupportItemView {
  destroy(): void;
}

export interface SupportItemDescriptor {
  element: HTMLElement;
  onClick(): void;
}
export interface Conversations {
  registerThreadViewHandler(
    callback: (threadView: ThreadView) => void,
  ): () => void;
  registerMessageViewHandler(
    callback: (messageView: MessageView) => void,
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
    descriptor: NavItemDescriptor | Kefir.Observable<NavItemDescriptor, any>,
  ): NavItemView;
}

export interface Router {
  createLink(routeID: string, params?: any): string;
  getCurrentRouteView(): RouteView;
  goto(routeID: string, params?: any): Promise<void>;
  handleAllRoutes(handler: (routeView: RouteView) => void): () => void;
  handleCustomRoute(
    routeID: string,
    handler: (customRouteView: CustomRouteView) => void,
  ): () => void;
  handleCustomListRoute(
    routeID: string,
    handler: (offset: number, max: number) => void,
  ): void;
  handleListRoute(
    routeID: string,
    handler: (listRouteView: ListRouteView) => void,
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
  showMoleView(descriptor: MoleOptions): MoleView;
  showDrawerView(descriptor: DrawerDescriptor): DrawerView;
  showTopMessageBarView(opts: { el: Element }): TopMessageBarView;
}

export { Toolbars, LegacyToolbarButtonDescriptor };
export {
  ToolbarButtonDescriptor,
  ToolbarButtonOnClickEvent,
} from './platform-implementation-js/namespaces/toolbars';

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
    descriptor: KeyboardShortcutDescriptor,
  ): KeyboardShortcutHandle;
}

export interface Lists {
  registerThreadRowViewHandler(
    handler: (threadRowView: ThreadRowView) => void,
  ): () => void;
  getSelectedThreadRowViews(): ThreadRowView[];
  registerThreadRowViewSelectionHandler(handler: () => void): () => void;
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
    driver: GmailDriver,
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
    closeWithCompose?: boolean,
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

/** @deprecated use MoleOptions interface directly instead */
export { type MoleOptions as MoleDescriptor };
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

export { MoleView };

export interface SimpleElementView extends EventEmitter {
  el: HTMLElement;
  destroyed: boolean;
  destroy(): void;
}

export interface ThreadView extends TypedEventEmitter<ThreadViewEvents> {
  addLabel(): SimpleElementView;
  addSidebarContentPanel(
    contentPanelDescriptor:
      | ContentPanelDescriptor
      | Kefir.Observable<ContentPanelDescriptor, unknown>,
  ): ContentPanelView;
  /**
   * @returns {MessageView[]} of all the loaded MessageView objects currently in the thread. @see MessageView for more information on what "loaded" means. Note that more messages may load into the thread later! If it's important to get future messages, use {@link Conversations#registerMessageViewHandler} instead.
   */
  getMessageViews(): Array<MessageView>;
  /**
   * @returns {MessageView[]} of all the MessageView objects in the thread regardless of their load state. @see MessageView for more information on what "loaded" means.
   */
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
      unmountPromise: Promise<void>,
    ) => HTMLElement | null,
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

export { ContentPanelView };

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

export type { MessageViewViewStates } from './platform-implementation-js/namespaces/conversations';

/**
 * Represents a visible message in the UI. There are properties to access data about the message itself as well as change the state of the UI. MessageViews have a view state as well as a loaded state. These 2 properties are orthogonal to each other.

 * A messages' view state can be one of {@link MessageViewViewStates.EXPANDED}, {@link MessageViewViewStates.COLLAPSED} or {@link MessageViewViewStates.HIDDEN}. Gmail visually display messages in a thread in different ways depending on what they are trying to show a user. These values are described in the enum MessageViewViewStates. The load state of a message determines whether all of the data pertaining to a message has been loaded in the UI. In some case, not all the information (such as recipients or the body) may be loaded, typically when the the view state is COLLAPSED or HIDDEN.

 * @note You should not depend on any relationship between the view state
 * and load state. Instead, use the provided {MessageView#getViewState} and {MessageView#isLoaded} methods.
 */
export interface MessageView extends TypedEventEmitter<MessageViewEvent> {
  addAttachmentIcon(
    opts:
      | MessageAttachmentIconDescriptor
      | Kefir.Stream<MessageAttachmentIconDescriptor, never>,
  ): AttachmentIcon;
  addToolbarButton(opts?: MessageViewToolbarButtonDescriptor): void;
  getBodyElement(): HTMLElement;
  isElementInQuotedArea(element: HTMLElement): boolean;
  /**
   * Returns whether this message has been loaded yet. If the message has not been loaded, some of the data related methods on this object may return empty results. The message may be loaded once the user clicks on the message stub.
   */
  isLoaded(): boolean;
  getFileAttachmentCardViews(): AttachmentCardView[];
  /**
   * Get the contact of the sender of this message.

    * @returns {Contact} The contact of the sender of this message.
    * @throws {Error} If the message has not been loaded yet.
    *
    * @note If you're using this method on an array of {MessageView}s returned by {@link ThreadRowView#getMessageViewsAll}, make sure to check {@link MessageView#isLoaded} before calling this method.
   */
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

export {
  ComposeViewEvent,
  LinkPopOver,
  LinkPopOverSection,
} from './platform-implementation-js/views/compose-view';

export { ComposeView };

export interface SendOptions {
  sendAndArchive?: boolean;
}

export type ComposeViewDestroyEvent = Parameters<
  ComposeViewEvent['destroy']
>[0];

export { ComposeButtonDescriptor };

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

export type {
  AutocompleteSearchResult,
  default as Search,
  SearchQueryRewriter,
  SearchSuggestionsProvider,
} from './platform-implementation-js/namespaces/search';
