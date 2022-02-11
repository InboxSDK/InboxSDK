import * as Kefir from 'kefir';
import EventEmitter from 'events';

export interface Contact {
  emailAddress: string;
  name: null | undefined | string;
}

export interface TooltipDescriptor {
  el?: null | undefined | HTMLElement;
  title?: null | undefined | string;
  subtitle?: null | undefined | string;
  imageUrl?: null | undefined | string;
  button?: null | undefined | { onClick?: Function; title: string };
}

export interface ComposeNotice extends EventEmitter {
  destroy(): void;
  destroyed: boolean;
  el: HTMLElement;
}

export interface StatusBar extends EventEmitter {
  destroy(): void;
  destroyed: boolean;
  el: HTMLElement;
  setHeight(height: number): void;
}

export interface ComposeButtonDescriptor {
  title: string;
  iconUrl?: null | undefined | string;
  iconClass?: null | undefined | string;
  onClick: (event: object) => void;
  hasDropdown?: null | undefined | boolean;
  type?: null | undefined | string;
  orderHint?: null | undefined | number;
  enabled?: null | undefined | boolean;
}

export interface ComposeViewDriver {
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
  addToLinkPopup(): HTMLElement;
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
  setupLinkPopovers(): void;
}
