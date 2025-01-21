import EventEmitter from '../lib/safe-event-emitter';
import Kefir, { Observable } from 'kefir';
import kefirCast from 'kefir-cast';
import * as ud from 'ud';
import get from '../../common/get-or-fail';
import ComposeButtonView from './compose-button-view';

import type Membrane from '../lib/Membrane';
import type { Driver } from '../driver-interfaces/driver';
import type {
  ComposeViewDriver,
  ComposeNotice,
  StatusBar,
  ComposeButtonDescriptor,
} from '../driver-interfaces/compose-view-driver';
import type { Contact } from '../../inboxsdk';
import type TypedEventEmitter from 'typed-emitter';
import type {
  AddressChangeEventName,
  RecipientsChangedEvent,
} from '../dom-driver/gmail/views/gmail-compose-view/get-address-changes-stream';
import type { Descriptor } from '../../types/descriptor';
import kefirBus from 'kefir-bus';
import type { AddedButtonEvents } from '../dom-driver/gmail/views/gmail-compose-view/add-button';

interface Members {
  driver: Driver;
  membrane: Membrane;
  composeViewImplementation: ComposeViewDriver;
}

const memberMap = ud.defonce(module, () => new WeakMap<ComposeView, Members>());

export type LinkPopOver = {
  getLinkElement(): HTMLAnchorElement;
  addSection(): LinkPopOverSection;
  getPopOverContainerElement(): HTMLElement;
  getUrlInputElement(): HTMLInputElement | null;
  getTextInputElement(): HTMLInputElement | null;
} & TypedEventEmitter<{ close(): void }>;

export interface LinkPopOverSection {
  getElement(): HTMLElement;
  remove(): void;
}

type AddressChangeEventsMapped = {
  [P in AddressChangeEventName]: (data: { contact: Contact }) => void;
};

export type ComposeViewEvent = {
  newListener: (eventName: string) => void;
  close(): void;
  /*
   * @see ComposeViewDriverEvent.
   * TODO use the same underlying type for both here and there. */
  bodyChanged(): void;
  buttonAdded(): void;
  discardCanceled(): void;
  draftSaved(): void;
  fullscreenChanged(data: { fullscreen: boolean }): void;
  linkPopOver(data: LinkPopOver): void;
  minimized(): void;
  recipientsChanged(data: RecipientsChangedEvent): void;
  resize(): void;
  restored(): void;
  sendCanceled(): void;
  sending(): void;
  sent(data: {
    getMessageID(): Promise<string>;
    getThreadID(): Promise<string>;
  }): void;
  subjectChanged(): void;
  destroy(data: {
    /**
     * If the composeView was closed without being sent and the draft was saved, then this property will have the draft's message ID after it saved. Otherwise it will be null.
     */
    messageID: string | null | undefined;
    /**
     * Whether or not the ComposeView was closed by an extension calling ComposeView.close(), including other extensions besides your own. False if the ComposeView was closed due to a user action like clicking the discard/close buttons or hitting escape
     */
    closedByInboxSDK: boolean;
  }): void;
  discard(data: { cancel(): void }): void;
  responseTypeChanged(data: { isForward: boolean }): void;
  presending(data: { cancel(): void }): void;
  scheduleSendMenuOpening(data: { cancel(): void }): void;
  scheduleSendMenuOpenCanceled(): void;
  messageIDChange(data: string | null | undefined): void;
} & AddressChangeEventsMapped;

export default class ComposeView extends (EventEmitter as new () => TypedEventEmitter<ComposeViewEvent>) {
  destroyed: boolean = false;

  constructor(
    driver: Driver,
    composeViewImplementation: ComposeViewDriver,
    membrane: Membrane,
  ) {
    super();

    const members = {
      driver,
      membrane,
      composeViewImplementation,
    };
    memberMap.set(this, members);

    this.on('newListener', (eventName) => {
      if (eventName === 'close') {
        driver
          .getLogger()
          .deprecationWarning(
            'composeView close event',
            'composeView destroy event',
          );
        if (driver.getOpts().REQUESTED_API_VERSION !== 1) {
          console.error(
            'The composeView close event was removed after API version 1',
          );
        }
      } else if (eventName === 'messageIDChange') {
        driver
          .getLogger()
          .deprecationWarning(
            'composeView messageIDChange event',
            'composeView.getDraftID',
          );
        if (driver.getOpts().REQUESTED_API_VERSION !== 1) {
          console.error(
            'The composeView messageIDChange event was removed after API version 1',
          );
        }
      } else if (eventName === 'linkPopOver') {
        composeViewImplementation.setupLinkPopOvers();
      }
    });

    members.composeViewImplementation.getEventStream().onValue((event) => {
      if (event.eventName === 'destroy') {
        this.destroyed = true;
        if (driver.getOpts().REQUESTED_API_VERSION === 1) {
          this.emit('close'); /* deprecated */
        }
      } else if (event.eventName === 'messageIDChange') {
        if (driver.getOpts().REQUESTED_API_VERSION !== 1) {
          return;
        }
      }
      this.emit(event.eventName, event.data);
    });
  }

  /**
   * Inserts a button into the compose bar. This method also accepts a stream of {@link ComposeButtonDescriptor}s so that you can change the appearance of your button after you've added it.
   *
   * @param buttonDescriptor The details of the button to add to the compose bar.
   */
  addButton(
    buttonDescriptor: Descriptor<ComposeButtonDescriptor | null | undefined>,
  ) {
    const members = get(memberMap, this);
    const buttonDescriptorStream = kefirCast(
      Kefir,
      buttonDescriptor,
    ) as Observable<ComposeButtonDescriptor | null | undefined, unknown>;

    const bus = kefirBus<AddedButtonEvents, unknown>();

    members.composeViewImplementation.addButton(
      buttonDescriptorStream,
      members.driver.getAppId(),
      { composeView: this },
      bus,
    );
    const view = new ComposeButtonView(
      bus,
      members.composeViewImplementation,
      members.driver,
    );

    view.on('destroy', () => {
      bus.end();
    });

    return view;
  }

  addComposeNotice(composeNoticeDescriptor?: {
    height?: number;
    orderHint?: number;
  }): ComposeNotice {
    return get(memberMap, this).composeViewImplementation.addComposeNotice(
      composeNoticeDescriptor,
    );
  }

  addStatusBar(statusBarDescriptor?: {
    height?: number;
    orderHint?: number;
    addAboveNativeStatusBar?: boolean;
  }): StatusBar {
    return get(memberMap, this).composeViewImplementation.addStatusBar(
      statusBarDescriptor,
    );
  }

  hideNativeStatusBar(): () => void {
    return get(memberMap, this).composeViewImplementation.hideNativeStatusBar();
  }

  addRecipientRow(options: any): { destroy(): void } {
    return {
      destroy: get(memberMap, this).composeViewImplementation.addRecipientRow(
        kefirCast(Kefir, options),
      ),
    };
  }

  forceRecipientRowsOpen(): () => void {
    return get(
      memberMap,
      this,
    ).composeViewImplementation.forceRecipientRowsOpen();
  }

  hideNativeRecipientRows(): () => void {
    return get(
      memberMap,
      this,
    ).composeViewImplementation.hideNativeRecipientRows();
  }

  hideRecipientArea(): () => void {
    return get(memberMap, this).composeViewImplementation.hideRecipientArea();
  }

  close() {
    get(memberMap, this).composeViewImplementation.close();
  }

  send(
    { sendAndArchive }: { sendAndArchive: boolean } = { sendAndArchive: false },
  ) {
    get(memberMap, this).composeViewImplementation.send({ sendAndArchive });
  }

  openScheduleSendMenu() {
    get(memberMap, this).composeViewImplementation.openScheduleSendMenu();
  }

  discard() {
    get(memberMap, this).composeViewImplementation.discard();
  }

  getMetadataForm(): HTMLElement {
    return get(
      memberMap,
      this,
    ).composeViewImplementation.getMetadataFormElement();
  }

  getSubjectInput(): HTMLInputElement {
    return get(memberMap, this).composeViewImplementation.getSubjectInput()!;
  }

  getBodyElement(): HTMLElement {
    return get(memberMap, this).composeViewImplementation.getBodyElement()!;
  }

  // NOT DOCUMENTED BECAUSE NOT SURE IF API USERS NEED THIS
  // TODO remove?
  getComposeID(): string {
    const { driver, composeViewImplementation } = get(memberMap, this);
    driver.getLogger().deprecationWarning('composeView.getComposeID');
    if (driver.getOpts().REQUESTED_API_VERSION !== 1) {
      throw new Error('This method was discontinued after API version 1');
    }
    return composeViewImplementation.getComposeID();
  }

  getInitialMessageID(): string {
    return get(
      memberMap,
      this,
    ).composeViewImplementation.getInitialMessageID()!;
  }

  /* deprecated */
  getMessageID(): string {
    const { driver, composeViewImplementation } = get(memberMap, this);
    driver
      .getLogger()
      .deprecationWarning('composeView.getMessageID', 'composeView.getDraftID');
    if (driver.getOpts().REQUESTED_API_VERSION !== 1) {
      throw new Error('This method was discontinued after API version 1');
    }
    return composeViewImplementation.getMessageID()!;
  }

  getThreadID(): string {
    return get(memberMap, this).composeViewImplementation.getThreadID()!;
  }

  getDraftID(): Promise<string | undefined | null> {
    return get(memberMap, this).composeViewImplementation.getDraftID();
  }

  getCurrentDraftID(): Promise<string | null | undefined> {
    return get(memberMap, this).composeViewImplementation.getCurrentDraftID();
  }

  getHTMLContent(): string {
    return get(memberMap, this).composeViewImplementation.getHTMLContent();
  }

  getSelectedBodyHTML(): string | null | void {
    return (
      get(memberMap, this).composeViewImplementation.getSelectedBodyHTML() || ''
    );
  }

  getSelectedBodyText(): string | null | void {
    return (
      get(memberMap, this).composeViewImplementation.getSelectedBodyText() || ''
    );
  }

  getSubject(): string {
    return get(memberMap, this).composeViewImplementation.getSubject();
  }

  getTextContent(): string {
    return get(memberMap, this).composeViewImplementation.getTextContent();
  }

  getToRecipients(): Contact[] {
    return get(memberMap, this).composeViewImplementation.getToRecipients();
  }

  getCcRecipients(): Contact[] {
    return get(memberMap, this).composeViewImplementation.getCcRecipients();
  }

  getBccRecipients(): Contact[] {
    return get(memberMap, this).composeViewImplementation.getBccRecipients();
  }

  insertTextIntoBodyAtCursor(text: string): HTMLElement | null | void {
    return get(
      memberMap,
      this,
    ).composeViewImplementation.insertBodyTextAtCursor(text);
  }

  insertHTMLIntoBodyAtCursor(html: string): HTMLElement | null | undefined {
    return get(
      memberMap,
      this,
    ).composeViewImplementation.insertBodyHTMLAtCursor(html);
  }

  insertLinkChipIntoBodyAtCursor(
    text: string,
    url: string,
    iconUrl: string,
  ): HTMLElement | void {
    if (
      !iconUrl ||
      typeof iconUrl !== 'string' ||
      iconUrl.indexOf('http') !== 0
    ) {
      console.warn('You must provide a publicly accessible iconUrl');
      return;
    }

    return get(
      memberMap,
      this,
    ).composeViewImplementation.insertLinkChipIntoBody({
      text: text,
      url: url,
      iconUrl: iconUrl,
    });
  }

  insertLinkIntoBodyAtCursor(
    text: string,
    url: string,
  ): HTMLElement | null | void {
    return get(memberMap, this).composeViewImplementation.insertLinkIntoBody(
      text,
      url,
    );
  }

  isForward(): boolean {
    return get(memberMap, this).composeViewImplementation.isForward();
  }

  isInlineReplyForm(): boolean {
    return get(memberMap, this).composeViewImplementation.isInlineReplyForm();
  }

  isFullscreen(): boolean {
    return get(memberMap, this).composeViewImplementation.isFullscreen();
  }

  setFullscreen(fullscreen: boolean) {
    get(memberMap, this).composeViewImplementation.setFullscreen(fullscreen);
  }

  isMinimized(): boolean {
    return get(memberMap, this).composeViewImplementation.isMinimized();
  }

  setMinimized(minimized: boolean) {
    get(memberMap, this).composeViewImplementation.setMinimized(minimized);
  }

  setTitleBarColor(color: string): () => void {
    return get(memberMap, this).composeViewImplementation.setTitleBarColor(
      color,
    );
  }

  setTitleBarText(text: string): () => void {
    return get(memberMap, this).composeViewImplementation.setTitleBarText(text);
  }

  async popOut(): Promise<ComposeView> {
    const nextComposeViewDriverPromise = get(
      memberMap,
      this,
    ).driver.getNextComposeViewDriver();
    get(memberMap, this).composeViewImplementation.popOut();
    const nextComposeViewDriver = await nextComposeViewDriverPromise;
    return get(memberMap, this).membrane.get(nextComposeViewDriver);
  }

  isReply(): boolean {
    return get(memberMap, this).composeViewImplementation.isReply();
  }

  setToRecipients(emails: string[]) {
    get(memberMap, this).composeViewImplementation.setToRecipients(emails);
  }

  setCcRecipients(emails: string[]) {
    get(memberMap, this).composeViewImplementation.setCcRecipients(emails);
  }

  setBccRecipients(emails: string[]) {
    get(memberMap, this).composeViewImplementation.setBccRecipients(emails);
  }

  getFromContact(): Contact {
    return get(memberMap, this).composeViewImplementation.getFromContact();
  }

  getFromContactChoices(): Contact[] {
    return get(
      memberMap,
      this,
    ).composeViewImplementation.getFromContactChoices();
  }

  setFromEmail(email: string) {
    get(memberMap, this).composeViewImplementation.setFromEmail(email);
  }

  setSubject(text: string) {
    get(memberMap, this).composeViewImplementation.setSubject(text);
  }

  setBodyHTML(html: string) {
    get(memberMap, this).composeViewImplementation.setBodyHTML(html);
  }

  setBodyText(text: string) {
    get(memberMap, this).composeViewImplementation.setBodyText(text);
  }

  async attachFiles(files: Blob[]): Promise<void> {
    if (files.length === 0) {
      return;
    }
    if (!(files[0] instanceof Blob)) {
      throw new Error('parameter must be an array of Blob objects');
    }
    return get(memberMap, this).composeViewImplementation.attachFiles(
      Array.from(files),
    );
  }

  async attachInlineFiles(files: Blob[]): Promise<void> {
    if (files.length === 0) {
      return;
    }
    if (!(files[0] instanceof Blob)) {
      throw new Error('parameter must be an array of Blob objects');
    }
    return get(memberMap, this).composeViewImplementation.attachInlineFiles(
      Array.from(files),
    );
  }

  // Old alias that we should keep around until we're sure no one is using it.
  dragFilesIntoCompose(files: Blob[]): Promise<void> {
    const { driver } = get(memberMap, this);
    driver
      .getLogger()
      .deprecationWarning(
        'ComposeView.dragFilesIntoCompose',
        'ComposeView.attachInlineFiles',
      );
    if (driver.getOpts().REQUESTED_API_VERSION !== 1) {
      throw new Error('This method was discontinued after API version 1');
    }
    return this.attachInlineFiles(files);
  }

  //NOT DOCUMENTED BECAUSE STREAK-ONLY FOR NOW
  getElement(): HTMLElement {
    return get(memberMap, this).composeViewImplementation.getElement();
  }

  registerRequestModifier(
    modifier: (composeParams: { body: string; isPlainText?: boolean }) =>
      | {
          body: string;
        }
      | Promise<{
          body: string;
        }>,
  ) {
    get(memberMap, this).composeViewImplementation.registerRequestModifier(
      modifier,
    );
  }

  replaceSendButton({ el }: { el: HTMLElement }): () => void {
    return get(memberMap, this).composeViewImplementation.replaceSendButton(el);
  }

  hideDiscardButton(): () => void {
    return get(memberMap, this).composeViewImplementation.hideDiscardButton();
  }

  ensureFormattingToolbarIsHidden() {
    get(
      memberMap,
      this,
    ).composeViewImplementation.ensureFormattingToolbarIsHidden();
  }

  ensureAppButtonToolbarsAreClosed() {
    get(
      memberMap,
      this,
    ).composeViewImplementation.ensureAppButtonToolbarsAreClosed();
  }

  // TODO remove
  overrideEditSubject() {
    const { driver, composeViewImplementation } = get(memberMap, this);
    driver.getLogger().deprecationWarning('composeView.overrideEditSubject');
    if (driver.getOpts().REQUESTED_API_VERSION !== 1) {
      throw new Error('This method was discontinued after API version 1');
    }
    if (typeof composeViewImplementation.overrideEditSubject === 'function') {
      composeViewImplementation.overrideEditSubject();
    }
  }
}
