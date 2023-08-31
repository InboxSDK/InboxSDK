import type * as Kefir from 'kefir';
import type EventEmitter from 'events';
import type { TooltipDescriptor } from '../views/compose-button-view';
import type { Contact } from '../../inboxsdk';
import type {
  AddressChangeEventName,
  RecipientsChangedEvent,
} from '../dom-driver/gmail/views/gmail-compose-view/get-address-changes-stream';

export type ComposeNotice = EventEmitter & {
  destroy(): void;
  destroyed: boolean;
  el: HTMLElement;
};
export type StatusBar = EventEmitter & {
  destroy(): void;
  destroyed: boolean;
  el: HTMLElement;
  setHeight(height: number): void;
};
export type ComposeButtonDescriptor = {
  title: string;
  iconUrl?: string | null | undefined;
  iconClass?: string | null | undefined;
  onClick: (event: Record<string, any>) => void;
  hasDropdown?: boolean | null | undefined;
  type?: string | null | undefined;
  orderHint?: number | null | undefined;
  enabled?: boolean | null | undefined;
};

export type ComposeViewDriverEvent =
  | {
      eventName:
        | 'buttonAdded'
        | 'bodyChanged'
        | 'discardCanceled'
        | 'draftSaved'
        | 'minimized'
        | 'resize'
        | 'restored'
        | 'sendCanceled'
        | 'sending'
        | 'sent'
        | 'subjectChanged';
      // Added to appease tsc where `unknown` or omitting `data` causes errors
      data?: any;
    }
  | {
      eventName: 'destroy';
      data: {
        messageID: string | null | undefined;
        closedByInboxSDK: boolean;
      };
    }
  | {
      eventName: 'recipientsChanged';
      data: RecipientsChangedEvent;
    }
  | {
      eventName: 'fullscreenChanged';
      data: {
        fullscreen: boolean;
      };
    }
  | {
      eventName: 'responseTypeChanged';
      data: {
        isForward: boolean;
      };
    }
  | {
      eventName: 'presending';
      data: {
        cancel(): void;
      };
    }
  | {
      eventName: 'sent';
      data: {
        getMessageID(): Promise<string>;
        getThreadID(): Promise<string>;
      };
    }
  | {
      eventName: 'discard';
      data: {
        cancel(): void;
      };
    }
  | {
      eventName: 'messageIDChange';
      data: string | null | undefined;
    }
  | {
      eventName: AddressChangeEventName;
      data: {
        contact: Contact;
      };
    };

export type ComposeViewDriver = {
  getEventStream(): Kefir.Observable<ComposeViewDriverEvent, unknown>;
  getStopper(): Kefir.Observable<any, unknown>;
  getElement(): HTMLElement;
  insertBodyTextAtCursor(text: string): HTMLElement | null | undefined;
  insertBodyHTMLAtCursor(html: string): HTMLElement | null | undefined;
  insertLinkIntoBody(
    text: string,
    href: string
  ): HTMLElement | null | undefined;
  insertLinkChipIntoBody(options: {
    iconUrl?: string;
    url: string;
    text: string;
  }): HTMLElement;
  setSubject(text: string): void;
  setBodyHTML(html: string): void;
  setBodyText(text: string): void;
  setToRecipients(emails: string[]): void;
  setCcRecipients(emails: string[]): void;
  setBccRecipients(emails: string[]): void;
  getFromContact(): Contact;
  getFromContactChoices(): Contact[];
  setFromEmail(email: string): void;
  focus(): void;
  close(): void;
  send(arg0: { sendAndArchive: boolean }): void;
  discard(): void;
  popOut(): void;
  replaceSendButton(el: HTMLElement): () => void;
  hideDiscardButton(): () => void;
  overrideEditSubject?: () => void;
  registerRequestModifier(modifier: Record<string, any>): void;
  attachFiles(files: Blob[]): Promise<void>;
  attachInlineFiles(files: Blob[]): Promise<void>;
  isFullscreen(): boolean;
  setFullscreen(fullscreen: boolean): void;
  isMinimized(): boolean;
  setMinimized(minimized: boolean): void;
  setTitleBarColor(color: string): () => void;
  setTitleBarText(text: string): () => void;
  addButton(
    buttonDescriptor: Kefir.Observable<
      ComposeButtonDescriptor | null | undefined,
      unknown
    >,
    groupOrderHint: string,
    extraOnClickOptions: Record<string, any>
  ): Promise<any | null | undefined>;
  addRecipientRow(
    options: Kefir.Observable<Record<string, any> | null | undefined, unknown>
  ): () => void;
  forceRecipientRowsOpen(): () => void;
  hideNativeRecipientRows(): () => void;
  hideRecipientArea(): () => void;
  ensureFormattingToolbarIsHidden(): void;
  ensureAppButtonToolbarsAreClosed(): void;
  // addOuterSidebar(options: {title: string, el: HTMLElement}): void;
  // addInnerSidebar(options: {el: HTMLElement}): void;
  addComposeNotice(options?: { orderHint?: number }): ComposeNotice;
  addStatusBar(options?: {
    height?: number;
    orderHint?: number;
    addAboveNativeStatusBar?: boolean;
  }): StatusBar;
  hideNativeStatusBar(): () => void;
  isForward(): boolean;
  isReply(): boolean;
  isInlineReplyForm(): boolean;
  getBodyElement(): HTMLElement;
  getMetadataFormElement(): HTMLElement;
  getSubjectInput(): HTMLInputElement | null | undefined;
  getHTMLContent(): string;
  getTextContent(): string;
  getSelectedBodyHTML(): string | null | undefined;
  getSelectedBodyText(): string | null | undefined;
  getSubject(): string;
  getToRecipients(): Contact[];
  getCcRecipients(): Contact[];
  getBccRecipients(): Contact[];
  getComposeID(): string;
  getInitialMessageID(): string | null | undefined;
  getMessageID(): string | null | undefined;
  getThreadID(): string | null | undefined;
  getCurrentDraftID(): Promise<string | null | undefined>;
  getDraftID(): Promise<string | null | undefined>;
  addTooltipToButton(
    buttonViewController: Record<string, any>,
    buttonDescriptor: Record<string, any>,
    tooltipDescriptor: TooltipDescriptor
  ): void;
  closeButtonTooltip(buttonViewController: Record<string, any>): void;
  setupLinkPopOvers(): void;
};
