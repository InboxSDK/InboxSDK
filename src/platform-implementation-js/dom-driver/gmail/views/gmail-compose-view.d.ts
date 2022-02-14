import * as Kefir from 'kefir';
import GmailDriver from '../gmail-driver';

import {
  Contact,
  ComposeNotice,
  ComposeViewDriver,
  StatusBar,
  ComposeButtonDescriptor,
  TooltipDescriptor
} from '../../../driver-interfaces/compose-view-driver';

export default class GmailComposeView implements ComposeViewDriver {
  public constructor(
    element: HTMLElement,
    xhrInterceptorStream: Kefir.Observable<any, any>,
    driver: GmailDriver,
    options: {
      isInlineReplyForm: boolean;
      isStandalone: boolean;
    }
  );
  public getGmailDriver(): GmailDriver;
  public getStatusArea(): HTMLElement;

  // interface methods
  public getEventStream(): Kefir.Observable<any, any>;
  public getStopper(): Kefir.Observable<any, never>;
  public getElement(): HTMLElement;
  public insertBodyTextAtCursor(text: string): null | undefined | HTMLElement;
  public insertBodyHTMLAtCursor(html: string): null | undefined | HTMLElement;
  public insertLinkIntoBody(
    text: string,
    href: string
  ): null | undefined | HTMLElement;
  public insertLinkChipIntoBody(options: {
    iconUrl?: string;
    url: string;
    text: string;
  }): HTMLElement;
  public addToLinkPopup(): HTMLElement;
  public setSubject(text: string): void;
  public setBodyHTML(html: string): void;
  public setBodyText(text: string): void;
  public setToRecipients(emails: ReadonlyArray<string>): void;
  public setCcRecipients(emails: ReadonlyArray<string>): void;
  public setBccRecipients(emails: ReadonlyArray<string>): void;
  public getFromContact(): Contact;
  public getFromContactChoices(): ReadonlyArray<Contact>;
  public setFromEmail(email: string): void;
  public focus(): void;
  public close(): void;
  public send(options: { sendAndArchive: boolean }): void;
  public discard(): void;
  public popOut(): void;
  public replaceSendButton(el: HTMLElement): () => void;
  public hideDiscardButton(): () => void;
  public registerRequestModifier(modifier: object): void;
  public attachFiles(files: Blob[]): Promise<void>;
  public attachInlineFiles(files: Blob[]): Promise<void>;
  public isFullscreen(): boolean;
  public setFullscreen(fullscreen: boolean): void;
  public isMinimized(): boolean;
  public setMinimized(minimized: boolean): void;
  public setTitleBarColor(color: string): () => void;
  public setTitleBarText(text: string): () => void;
  public addButton(
    buttonDescriptor: Kefir.Observable<
      null | undefined | ComposeButtonDescriptor,
      any
    >,
    groupOrderHint: string,
    extraOnClickOptions: object
  ): Promise<null | undefined | object>;
  public addRecipientRow(
    options: Kefir.Observable<null | undefined | object, any>
  ): () => void;
  public forceRecipientRowsOpen(): () => void;
  public hideNativeRecipientRows(): () => void;
  public hideRecipientArea(): () => void;
  public ensureFormattingToolbarIsHidden(): void;
  public ensureAppButtonToolbarsAreClosed(): void;
  // addOuterSidebar(options: {title: string, el: HTMLElement}): void;
  // addInnerSidebar(options: {el: HTMLElement}): void;
  public addComposeNotice(options?: { orderHint?: number }): ComposeNotice;
  public addStatusBar(options?: {
    height?: number;
    orderHint?: number;
    addAboveNativeStatusBar?: boolean;
  }): StatusBar;
  public hideNativeStatusBar(): () => void;
  public isForward(): boolean;
  public isReply(): boolean;
  public isInlineReplyForm(): boolean;
  public getBodyElement(): HTMLElement;
  public getMetadataFormElement(): HTMLElement;
  public getSubjectInput(): null | undefined | HTMLInputElement;
  public getHTMLContent(): string;
  public getTextContent(): string;
  public getSelectedBodyHTML(): null | undefined | string;
  public getSelectedBodyText(): null | undefined | string;
  public getSubject(): string;
  public getToRecipients(): ReadonlyArray<Contact>;
  public getCcRecipients(): ReadonlyArray<Contact>;
  public getBccRecipients(): ReadonlyArray<Contact>;
  public getComposeID(): string;
  public getInitialMessageID(): null | undefined | string;
  public getMessageID(): null | undefined | string;
  public getThreadID(): null | undefined | string;
  public getCurrentDraftID(): Promise<null | string>;
  public getDraftID(): Promise<null | string>;
  public addTooltipToButton(
    buttonViewController: object,
    buttonDescriptor: object,
    tooltipDescriptor: TooltipDescriptor
  ): void;
  public closeButtonTooltip(buttonViewController: object): void;
  public setupLinkPopOvers(): void;
}
