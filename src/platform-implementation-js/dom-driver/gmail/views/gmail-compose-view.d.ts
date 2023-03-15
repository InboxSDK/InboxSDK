import * as Kefir from 'kefir';
import GmailDriver from '../gmail-driver';

import {
  Contact,
  ComposeNotice,
  ComposeViewDriver,
  StatusBar,
  ComposeButtonDescriptor,
  TooltipDescriptor,
} from '../../../driver-interfaces/compose-view-driver';

export default class GmailComposeView implements ComposeViewDriver {
  constructor(
    element: HTMLElement,
    xhrInterceptorStream: Kefir.Observable<any, any>,
    driver: GmailDriver,
    options: {
      isInlineReplyForm: boolean;
      isStandalone: boolean;
    }
  );
  destroy(): void;
  getGmailDriver(): GmailDriver;
  getStatusArea(): HTMLElement;

  // interface methods
  getEventStream(): Kefir.Observable<any, any>;
  getStopper(): Kefir.Observable<any, never>;
  getElement(): HTMLElement;
  insertBodyTextAtCursor(text: string): null | undefined | HTMLElement;
  insertBodyHTMLAtCursor(html: string): null | undefined | HTMLElement;
  insertLinkIntoBody(
    text: string,
    href: string
  ): null | undefined | HTMLElement;
  insertLinkChipIntoBody(options: {
    iconUrl?: string;
    url: string;
    text: string;
  }): HTMLElement;
  setSubject(text: string): void;
  setBodyHTML(html: string): void;
  setBodyText(text: string): void;
  setToRecipients(emails: ReadonlyArray<string>): void;
  setCcRecipients(emails: ReadonlyArray<string>): void;
  setBccRecipients(emails: ReadonlyArray<string>): void;
  getFromContact(): Contact;
  getFromContactChoices(): ReadonlyArray<Contact>;
  setFromEmail(email: string): void;
  focus(): void;
  close(): void;
  send(options: { sendAndArchive: boolean }): void;
  discard(): void;
  popOut(): void;
  replaceSendButton(el: HTMLElement): () => void;
  hideDiscardButton(): () => void;
  registerRequestModifier(modifier: object): void;
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
      null | undefined | ComposeButtonDescriptor,
      any
    >,
    groupOrderHint: string,
    extraOnClickOptions: object
  ): Promise<null | undefined | object>;
  addRecipientRow(
    options: Kefir.Observable<null | undefined | object, any>
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
  getSubjectInput(): null | undefined | HTMLInputElement;
  getHTMLContent(): string;
  getTextContent(): string;
  getSelectedBodyHTML(): null | undefined | string;
  getSelectedBodyText(): null | undefined | string;
  getLastSelectionRange(): Range | undefined;
  getSubject(): string;
  getToRecipients(): ReadonlyArray<Contact>;
  getCcRecipients(): ReadonlyArray<Contact>;
  getBccRecipients(): ReadonlyArray<Contact>;
  getComposeID(): string;
  getInitialMessageID(): null | undefined | string;
  getMessageID(): null | undefined | string;
  getThreadID(): null | undefined | string;
  getCurrentDraftID(): Promise<null | string>;
  getDraftID(): Promise<null | string>;
  addTooltipToButton(
    buttonViewController: object,
    buttonDescriptor: object,
    tooltipDescriptor: TooltipDescriptor
  ): void;
  closeButtonTooltip(buttonViewController: object): void;
  setupLinkPopOvers(): void;
}
