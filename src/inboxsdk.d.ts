import { EventEmitter } from 'events';
import type * as Kefir from 'kefir';
import type TypedEmitter from 'typed-emitter';
import AppMenu from './platform-implementation-js/namespaces/app-menu';
import Compose from './platform-implementation-js/namespaces/compose';
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
import type ThreadRowView from './platform-implementation-js/views/thread-row-view';
import { default as MessageView } from './platform-implementation-js/views/conversations/message-view';
import type ThreadView from './platform-implementation-js/views/conversations/thread-view';
import type { ComposeViewEvent } from './platform-implementation-js/views/compose-view';
import type TopMessageBarView from './platform-implementation-js/widgets/top-message-bar-view';
import type { IMoleView as MoleView } from './platform-implementation-js/widgets/mole-view';
export * from './platform-implementation-js/dom-driver/gmail/views/gmail-nav-item-view';
import type User from './platform-implementation-js/namespaces/user';
import { ContentPanelDescriptor } from './platform-implementation-js/driver-common/sidebar/ContentPanelViewDriver';
import type ContentPanelView from './platform-implementation-js/views/content-panel-view';
import type { MoleOptions } from './platform-implementation-js/dom-driver/gmail/widgets/gmail-mole-view-driver';
import type { ComposeButtonDescriptor } from './platform-implementation-js/driver-interfaces/compose-view-driver';
import type ComposeView from './platform-implementation-js/views/compose-view';
import type {
  default as Toolbars,
  LegacyToolbarButtonOnClickEvent,
  LegacyToolbarButtonDescriptor,
} from './platform-implementation-js/namespaces/toolbars';
import type CollapsibleSectionView from './platform-implementation-js/views/collapsible-section-view';
import type ListRouteView from './platform-implementation-js/views/route-view/list-route-view';
import type SectionView from './platform-implementation-js/views/section-view';
import Router, {
  type RouteParams,
} from './platform-implementation-js/namespaces/router';
import CustomRouteView from './platform-implementation-js/views/route-view/custom-route-view';
import type { PlatformImplementation } from './platform-implementation-js/platform-implementation';

export type { User };

export const LOADER_VERSION: string;

export function load(
  version: number,
  appId: string,
  opts: any,
): Promise<InboxSDK>;

// types

export type InboxSDK = PlatformImplementation;

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

export { Compose };

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

export { Router };

export interface Widgets {
  /** check whether mole view has light title bar as part of gmail new view / original view  */
  isMoleViewTitleBarLightColor(): boolean;
  showModalView(descriptor: ModalDescriptor): ModalView;
  showMoleView(descriptor: MoleOptions): MoleView;
  showDrawerView(descriptor: DrawerDescriptor): DrawerView;
  showTopMessageBarView(opts: { el: Element }): TopMessageBarView;
}

export {
  Toolbars,
  LegacyToolbarButtonDescriptor,
  LegacyToolbarButtonOnClickEvent,
};
export {
  ToolbarButtonDescriptor,
  ToolbarButtonOnClickEvent,
} from './platform-implementation-js/namespaces/toolbars';

export interface AppToolbarButtonDescriptor {
  title: string;
  titleClass?: string;
  iconUrl: string;
  iconClass?: string;
  onClick: (e: { dropdown?: DropdownView }) => void;
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
  default as ThreadRowView,
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

/**
 * This type is used to describe labels that you add to {@link ThreadRowView} and {@link CollapsibleSectionView}.
 */
export interface LabelDescriptor {
  /**
   * Text of the label.
   *
   * @todo marked as required in the docs.
   */
  title?: string;
  /** @internal is this still used? */
  titleHtml?: string;
  /** A background color to put on the icon element if present. */
  iconBackgroundColor?: string;
  /**
   * URL for the icon to show on the label. Should be a local extension file URL or a HTTPS URL.
   *
   * @todo marked as required in the docs
   */
  iconUrl?: string;
  /** A CSS class to apply to the icon. */
  iconClass?: string;
  /** Html for the icon to show on the label. This property can't be used with iconUrl or iconClass. */
  iconHtml?: string;
  /** The text color of the label. */
  foregroundColor?: string;
  /** The background color of the label. */
  backgroundColor?: string;
  /** Max width for the label title.The default label title max-width is 90px */
  maxWidth?: string;
}

export interface ThreadRowAttachmentIconDescriptor {
  iconUrl?: string;
  iconClass?: string;
  tooltip?: string;
}

export { NavItemView };

export { SectionView, CollapsibleSectionView };

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

/**
 * @alpha
 *
 * Provides the ability to pass arbitrary HTML into a cell in a {@link SectionView} or {@link CollapsibleSectionView} `tableRow`.
 */
export type RowDescriptorCellRenderer = (args: {
  /**
   * The element to render the column into.
   */
  el: HTMLElement;
  /**
   * A promise that resolves when the row is unmounted. This is useful for cleaning up any resources that were created when the row was mounted.
   */
  unmountPromise: Promise<void>;
}) => void;

/**
 * Represents the a single row to render in {@link SectionView}s and {@link CollapsibleSectionView}s
 */
export type RowDescriptor = {
  /** First textual column */
  title: string | RowDescriptorCellRenderer;
  /**
   * @alpha
   *
   * Render an HTMLElement in the attachment icon area. This is often used to render an icon for the attachment type.
   */
  attachmentIcon?: RowDescriptorCellRenderer;
  /** Last text right-aligned. Often used for dates. */
  shortDetailText: string | RowDescriptorCellRenderer;
  /**
   * Controls whether the row should be rendered as a read or unread message similar to Gmail styles.
   * This affects the row background and font weight. These can be separately controlled by passing an object.
   *
   * @defaultValue { background: false, text: true }
   */
  isRead?:
    | boolean
    | {
        /**
         * Controls whether the row background should be styled as read (in light themes: gray background) or unread (bright white background) similar to Gmail styles.
         */
        background: boolean;
        /**
         * Controls whether the row text should be styled as read (regular non-bold) or unread (bold text) similar to Gmail styles.
         */
        text: boolean;
      };
  /** Any labels that should be rendered. */
  labels: LabelDescriptor[];
  /** An optional class to apply to the icon. */
  iconClass?: string;
  /** An optional HTML to an icon to display on the left side of the row */
  iconHtml?: string | RowDescriptorCellRenderer;
  /** An optional url to an icon to display on the left side of the row */
  iconUrl?: string;
  /** The name of the route to navigate to when the row is clicked on. */
  routeID?: string;
  /** The parameters of the route being navigated to when the row is clicked on. */
  routeParams?: RouteParams;
  /** Callback for when the row is clicked on. */
  onClick?(): void;
} & (
  | {
      /**
       * @deprecated alias for {@link RowDescriptor#snippet}.
       */
      body: string;
    }
  | {
      /**
       * @alpha
       *
       * Second textual column. After {@link RowDescriptor#labels} if they're provided.
       */
      snippet: string | RowDescriptorCellRenderer;
    }
);

/**
 * The properties required to create a {@link SectionView} or {@link CollapsibleSectionView}.
 */
export interface SectionDescriptor {
  /**
   * Main title. After @inboxsdk/core@2.1.32, {@link SectionDescriptor#title} is placed after {@link SectionDescriptor#subtitle} if both are provided. If this behavior is not desired, we're open to a PR to add an option to configure it.
   *
   * @note required in docs, but in {@link SectionView} we have spots not passing it.
   */
  title?: string;
  /** Subtitle */
  subtitle?: string | null;
  /** Link to display in the summary area of the {@link SectionView}. Typically page counts are displayed here.	*/
  titleLinkText?: string;
  /** A function to call when the title link has been clicked. */
  onTitleLinkClick?(e: CollapsibleSectionView | SectionView): void;
  /** Whether to display a dropdown arrow for more options on the collapsible section. */
  hasDropdown?: boolean;
  /**
   * A function to call when the dropdown is opened. Your function is passed an event object with a single dropdown property.
   */
  onDropdownClick?(e: unknown): void;
  /** The rows that should be shown. */
  tableRows?: RowDescriptor[];
  /** An arbitrary HTML element to place above the table rows but below the title. */
  contentElement?: HTMLElement;
  /** A link to place in the footer of the {@link SectionView}.	 */
  footerLinkText?: string;
  /** A function to call when the link in the footer is clicked. */
  onFooterLinkClick?(e: CollapsibleSectionView | SectionView): void;
  /** @internal */
  orderHint?: unknown;
  /** @internal */
  footerLinkIconUrl?: unknown;
  /** @internal */
  footerLinkIconClass?: unknown;
}

export { ListRouteView };

export { CustomRouteView };

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
  onClick(e?: MouseEvent): void;
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

export { ThreadView };

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
  tooltip?: string | HTMLElement;
  onClick?: () => void;
}

export type AttachmentIcon = TypedEmitter<{
  tooltipHidden: () => void;
  tooltipShown: () => void;
}>;

export type { MessageViewViewStates } from './platform-implementation-js/namespaces/conversations';

export {
  default as MessageView,
  MessageViewToolbarButtonDescriptor,
  MessageViewToolbarSectionNames,
} from './platform-implementation-js/views/conversations/message-view';

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

/**
 * If the associated {@link ComposeButtonDescriptor#hasDropdown} is true, `dropdown` will be defined.
 */
export interface ComposeViewButtonOnClickEvent {
  composeView: ComposeView;
  dropdown?: DropdownView;
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
