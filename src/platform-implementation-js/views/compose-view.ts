/* eslint-disable no-console */

import EventEmitter from '../lib/safe-event-emitter';
import Kefir from 'kefir';
import kefirCast from 'kefir-cast';
import * as ud from 'ud';
import get from '../../common/get-or-fail';
import ComposeButtonView from './compose-button-view';

import Membrane from '../lib/Membrane';
import { Driver } from '../driver-interfaces/driver';
import {
  ComposeViewDriver,
  ComposeNotice,
  StatusBar,
  Contact
} from '../driver-interfaces/compose-view-driver';

const memberMap = ud.defonce(module, () => new WeakMap());

// documented in src/docs/
export default class ComposeView extends EventEmitter {
  public destroyed: boolean = false;

  public constructor(
    driver: Driver,
    composeViewImplementation: ComposeViewDriver,
    membrane: Membrane
  ) {
    super();

    const members = {
      driver,
      membrane,
      composeViewImplementation
    };
    memberMap.set(this, members);

    this.on('newListener', eventName => {
      if (eventName === 'close') {
        driver
          .getLogger()
          .deprecationWarning(
            'composeView close event',
            'composeView destroy event'
          );
        if (driver.getOpts().REQUESTED_API_VERSION !== 1) {
          console.error(
            'The composeView close event was removed after API version 1'
          );
        }
      } else if (eventName === 'messageIDChange') {
        driver
          .getLogger()
          .deprecationWarning(
            'composeView messageIDChange event',
            'composeView.getDraftID'
          );
        if (driver.getOpts().REQUESTED_API_VERSION !== 1) {
          console.error(
            'The composeView messageIDChange event was removed after API version 1'
          );
        }
      } else if (eventName === 'linkPopOver') {
        composeViewImplementation.setupLinkPopOvers();
      }
    });

    members.composeViewImplementation.getEventStream().onValue(event => {
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

  public addButton(buttonDescriptor: any) {
    const members = get(memberMap, this);
    const buttonDescriptorStream = kefirCast(Kefir, buttonDescriptor);

    const optionsPromise = members.composeViewImplementation.addButton(
      buttonDescriptorStream,
      members.driver.getAppId(),
      { composeView: this }
    );
    return new ComposeButtonView(
      optionsPromise,
      members.composeViewImplementation,
      members.driver
    );
  }

  /*
	// Incomplete
	addInnerSidebar(options){
		get(memberMap, this).composeViewImplementation.addInnerSidebar(options);
	}

	// Incomplete
	addOuterSidebar(options){
		get(memberMap, this).composeViewImplementation.addOuterSidebar(options);
	}
	*/

  public addComposeNotice(composeNoticeDescriptor?: {
    height?: number;
    orderHint?: number;
  }): ComposeNotice {
    return get(memberMap, this).composeViewImplementation.addComposeNotice(
      composeNoticeDescriptor
    );
  }

  public addStatusBar(statusBarDescriptor?: {
    height?: number;
    orderHint?: number;
    addAboveNativeStatusBar?: boolean;
  }): StatusBar {
    return get(memberMap, this).composeViewImplementation.addStatusBar(
      statusBarDescriptor
    );
  }

  public hideNativeStatusBar(): () => void {
    return get(memberMap, this).composeViewImplementation.hideNativeStatusBar();
  }

  public addRecipientRow(options: any): { destroy(): void } {
    return {
      destroy: get(memberMap, this).composeViewImplementation.addRecipientRow(
        kefirCast(Kefir, options)
      )
    };
  }

  public forceRecipientRowsOpen(): () => void {
    return get(
      memberMap,
      this
    ).composeViewImplementation.forceRecipientRowsOpen();
  }

  public hideNativeRecipientRows(): () => void {
    return get(
      memberMap,
      this
    ).composeViewImplementation.hideNativeRecipientRows();
  }

  public hideRecipientArea(): () => void {
    return get(memberMap, this).composeViewImplementation.hideRecipientArea();
  }

  public close() {
    get(memberMap, this).composeViewImplementation.close();
  }

  public send(
    { sendAndArchive }: { sendAndArchive: boolean } = { sendAndArchive: false }
  ) {
    get(memberMap, this).composeViewImplementation.send({ sendAndArchive });
  }

  public discard() {
    get(memberMap, this).composeViewImplementation.discard();
  }

  public getMetadataForm(): HTMLElement {
    return get(
      memberMap,
      this
    ).composeViewImplementation.getMetadataFormElement();
  }

  public getSubjectInput(): HTMLInputElement {
    return get(memberMap, this).composeViewImplementation.getSubjectInput();
  }

  public getBodyElement(): HTMLElement {
    return get(memberMap, this).composeViewImplementation.getBodyElement();
  }

  // NOT DOCUMENTED BECAUSE NOT SURE IF API USERS NEED THIS
  // TODO remove?
  public getComposeID(): string {
    const { driver, composeViewImplementation } = get(memberMap, this);
    driver.getLogger().deprecationWarning('composeView.getComposeID');
    if (driver.getOpts().REQUESTED_API_VERSION !== 1) {
      throw new Error('This method was discontinued after API version 1');
    }
    return composeViewImplementation.getComposeID();
  }

  public getInitialMessageID(): string {
    return get(memberMap, this).composeViewImplementation.getInitialMessageID();
  }

  /* deprecated */
  public getMessageID(): string {
    const { driver, composeViewImplementation } = get(memberMap, this);
    driver
      .getLogger()
      .deprecationWarning('composeView.getMessageID', 'composeView.getDraftID');
    if (driver.getOpts().REQUESTED_API_VERSION !== 1) {
      throw new Error('This method was discontinued after API version 1');
    }
    return composeViewImplementation.getMessageID();
  }

  public getThreadID(): string {
    return get(memberMap, this).composeViewImplementation.getThreadID();
  }

  public getDraftID(): Promise<string | null | void> {
    return get(memberMap, this).composeViewImplementation.getDraftID();
  }

  public getCurrentDraftID(): Promise<string | null | void> {
    return get(memberMap, this).composeViewImplementation.getCurrentDraftID();
  }

  public getHTMLContent(): string {
    return get(memberMap, this).composeViewImplementation.getHTMLContent();
  }

  public getSelectedBodyHTML(): string | null | void {
    return (
      get(memberMap, this).composeViewImplementation.getSelectedBodyHTML() || ''
    );
  }

  public getSelectedBodyText(): string | null | void {
    return (
      get(memberMap, this).composeViewImplementation.getSelectedBodyText() || ''
    );
  }

  public getSubject(): string {
    return get(memberMap, this).composeViewImplementation.getSubject();
  }

  public getTextContent(): string {
    return get(memberMap, this).composeViewImplementation.getTextContent();
  }

  public getToRecipients(): Contact[] {
    return get(memberMap, this).composeViewImplementation.getToRecipients();
  }

  public getCcRecipients(): Contact[] {
    return get(memberMap, this).composeViewImplementation.getCcRecipients();
  }

  public getBccRecipients(): Contact[] {
    return get(memberMap, this).composeViewImplementation.getBccRecipients();
  }

  public insertTextIntoBodyAtCursor(text: string): HTMLElement | null | void {
    return get(
      memberMap,
      this
    ).composeViewImplementation.insertBodyTextAtCursor(text);
  }

  public insertHTMLIntoBodyAtCursor(html: string): HTMLElement | null | void {
    return get(
      memberMap,
      this
    ).composeViewImplementation.insertBodyHTMLAtCursor(html);
  }

  public insertLinkChipIntoBodyAtCursor(
    text: string,
    url: string,
    iconUrl: string
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
      this
    ).composeViewImplementation.insertLinkChipIntoBody({
      text: text,
      url: url,
      iconUrl: iconUrl
    });
  }

  public insertLinkIntoBodyAtCursor(
    text: string,
    url: string
  ): HTMLElement | null | void {
    return get(memberMap, this).composeViewImplementation.insertLinkIntoBody(
      text,
      url
    );
  }

  public isForward(): boolean {
    return get(memberMap, this).composeViewImplementation.isForward();
  }

  public isInlineReplyForm(): boolean {
    return get(memberMap, this).composeViewImplementation.isInlineReplyForm();
  }

  public isFullscreen(): boolean {
    return get(memberMap, this).composeViewImplementation.isFullscreen();
  }

  public setFullscreen(fullscreen: boolean) {
    get(memberMap, this).composeViewImplementation.setFullscreen(fullscreen);
  }

  public isMinimized(): boolean {
    return get(memberMap, this).composeViewImplementation.isMinimized();
  }

  public setMinimized(minimized: boolean) {
    get(memberMap, this).composeViewImplementation.setMinimized(minimized);
  }

  public setTitleBarColor(color: string): () => void {
    return get(memberMap, this).composeViewImplementation.setTitleBarColor(
      color
    );
  }

  public setTitleBarText(text: string): () => void {
    return get(memberMap, this).composeViewImplementation.setTitleBarText(text);
  }

  public async popOut(): Promise<ComposeView> {
    const nextComposeViewDriverPromise = get(
      memberMap,
      this
    ).driver.getNextComposeViewDriver();
    get(memberMap, this).composeViewImplementation.popOut();
    const nextComposeViewDriver = await nextComposeViewDriverPromise;
    return get(memberMap, this).membrane.get(nextComposeViewDriver);
  }

  public isReply(): boolean {
    return get(memberMap, this).composeViewImplementation.isReply();
  }

  public setToRecipients(emails: string[]) {
    get(memberMap, this).composeViewImplementation.setToRecipients(emails);
  }

  public setCcRecipients(emails: string[]) {
    get(memberMap, this).composeViewImplementation.setCcRecipients(emails);
  }

  public setBccRecipients(emails: string[]) {
    get(memberMap, this).composeViewImplementation.setBccRecipients(emails);
  }

  public getFromContact(): Contact {
    return get(memberMap, this).composeViewImplementation.getFromContact();
  }

  public getFromContactChoices(): Contact[] {
    return get(
      memberMap,
      this
    ).composeViewImplementation.getFromContactChoices();
  }

  public setFromEmail(email: string) {
    get(memberMap, this).composeViewImplementation.setFromEmail(email);
  }

  public setSubject(text: string) {
    get(memberMap, this).composeViewImplementation.setSubject(text);
  }

  public setBodyHTML(html: string) {
    get(memberMap, this).composeViewImplementation.setBodyHTML(html);
  }

  public setBodyText(text: string) {
    get(memberMap, this).composeViewImplementation.setBodyText(text);
  }

  public async attachFiles(files: Blob[]): Promise<void> {
    if (files.length === 0) {
      return;
    }
    if (!(files[0] instanceof Blob)) {
      throw new Error('parameter must be an array of Blob objects');
    }
    return get(memberMap, this).composeViewImplementation.attachFiles(
      Array.from(files)
    );
  }

  public async attachInlineFiles(files: Blob[]): Promise<void> {
    if (files.length === 0) {
      return;
    }
    if (!(files[0] instanceof Blob)) {
      throw new Error('parameter must be an array of Blob objects');
    }
    return get(memberMap, this).composeViewImplementation.attachInlineFiles(
      Array.from(files)
    );
  }

  // Old alias that we should keep around until we're sure no one is using it.
  public dragFilesIntoCompose(files: Blob[]): Promise<void> {
    const { driver } = get(memberMap, this);
    driver
      .getLogger()
      .deprecationWarning(
        'ComposeView.dragFilesIntoCompose',
        'ComposeView.attachInlineFiles'
      );
    if (driver.getOpts().REQUESTED_API_VERSION !== 1) {
      throw new Error('This method was discontinued after API version 1');
    }
    return this.attachInlineFiles(files);
  }

  //NOT DOCUMENTED BECAUSE STREAK-ONLY FOR NOW
  public getElement(): HTMLElement {
    return get(memberMap, this).composeViewImplementation.getElement();
  }

  public registerRequestModifier(
    modifier: (composeParams: {
      body: string;
    }) => { body: string } | Promise<{ body: string }>
  ) {
    get(memberMap, this).composeViewImplementation.registerRequestModifier(
      modifier
    );
  }

  public replaceSendButton({ el }: { el: HTMLElement }): () => void {
    return get(memberMap, this).composeViewImplementation.replaceSendButton(el);
  }

  public hideDiscardButton(): () => void {
    return get(memberMap, this).composeViewImplementation.hideDiscardButton();
  }

  public ensureFormattingToolbarIsHidden() {
    get(
      memberMap,
      this
    ).composeViewImplementation.ensureFormattingToolbarIsHidden();
  }

  public ensureAppButtonToolbarsAreClosed() {
    get(
      memberMap,
      this
    ).composeViewImplementation.ensureAppButtonToolbarsAreClosed();
  }

  // TODO remove
  public overrideEditSubject() {
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
