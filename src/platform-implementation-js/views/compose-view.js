/* @flow */
/* eslint-disable no-console */

import EventEmitter from '../lib/safe-event-emitter';
import Kefir from 'kefir';
import kefirCast from 'kefir-cast';
import * as ud from 'ud';
import get from '../../common/get-or-fail';
import ComposeButtonView from './compose-button-view';

import type Membrane from '../lib/Membrane';
import type { Driver } from '../driver-interfaces/driver';
import type { ComposeViewDriver } from '../driver-interfaces/compose-view-driver';

const memberMap = ud.defonce(module, () => new WeakMap());

// documented in src/docs/
class ComposeView extends EventEmitter {
  destroyed: boolean = false;

  constructor(
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

    this.on('newListener', function(eventName) {
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

  addButton(buttonDescriptor: Object) {
    const members = get(memberMap, this);
    const buttonDescriptorStream = kefirCast((Kefir: any), buttonDescriptor);

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

  addComposeNotice(composeNoticeDescriptor?: {
    height?: number,
    orderHint?: number
  }) {
    return get(memberMap, this).composeViewImplementation.addComposeNotice(
      composeNoticeDescriptor
    );
  }

  addStatusBar(statusBarDescriptor?: {
    height?: number,
    orderHint?: number,
    addAboveNativeStatusBar?: boolean
  }) {
    return get(memberMap, this).composeViewImplementation.addStatusBar(
      statusBarDescriptor
    );
  }

  hideNativeStatusBar(): () => void {
    return get(memberMap, this).composeViewImplementation.hideNativeStatusBar();
  }

  addRecipientRow(options: ?Object) {
    return {
      destroy: get(memberMap, this).composeViewImplementation.addRecipientRow(
        kefirCast(Kefir, options)
      )
    };
  }

  forceRecipientRowsOpen(): () => void {
    return get(
      memberMap,
      this
    ).composeViewImplementation.forceRecipientRowsOpen();
  }

  hideNativeRecipientRows(): () => void {
    return get(
      memberMap,
      this
    ).composeViewImplementation.hideNativeRecipientRows();
  }

  hideRecipientArea(): () => void {
    return get(memberMap, this).composeViewImplementation.hideRecipientArea();
  }

  close() {
    get(memberMap, this).composeViewImplementation.close();
  }

  send(
    { sendAndArchive }: { sendAndArchive: boolean } = { sendAndArchive: false }
  ) {
    get(memberMap, this).composeViewImplementation.send({ sendAndArchive });
  }

  discard() {
    get(memberMap, this).composeViewImplementation.discard();
  }

  getMetadataForm() {
    return get(
      memberMap,
      this
    ).composeViewImplementation.getMetadataFormElement();
  }

  getSubjectInput() {
    return get(memberMap, this).composeViewImplementation.getSubjectInput();
  }

  getBodyElement() {
    return get(memberMap, this).composeViewImplementation.getBodyElement();
  }

  // NOT DOCUMENTED BECAUSE NOT SURE IF API USERS NEED THIS
  // TODO remove?
  getComposeID() {
    const { driver, composeViewImplementation } = get(memberMap, this);
    driver.getLogger().deprecationWarning('composeView.getComposeID');
    if (driver.getOpts().REQUESTED_API_VERSION !== 1) {
      throw new Error('This method was discontinued after API version 1');
    }
    return composeViewImplementation.getComposeID();
  }

  getInitialMessageID() {
    return get(memberMap, this).composeViewImplementation.getInitialMessageID();
  }

  /* deprecated */
  getMessageID() {
    const { driver, composeViewImplementation } = get(memberMap, this);
    driver
      .getLogger()
      .deprecationWarning('composeView.getMessageID', 'composeView.getDraftID');
    if (driver.getOpts().REQUESTED_API_VERSION !== 1) {
      throw new Error('This method was discontinued after API version 1');
    }
    return composeViewImplementation.getMessageID();
  }

  getThreadID() {
    return get(memberMap, this).composeViewImplementation.getThreadID();
  }

  getDraftID() {
    return get(memberMap, this).composeViewImplementation.getDraftID();
  }

  getCurrentDraftID() {
    return get(memberMap, this).composeViewImplementation.getCurrentDraftID();
  }

  getHTMLContent() {
    return get(memberMap, this).composeViewImplementation.getHTMLContent();
  }

  getSelectedBodyHTML() {
    return (
      get(memberMap, this).composeViewImplementation.getSelectedBodyHTML() || ''
    );
  }

  getSelectedBodyText() {
    return (
      get(memberMap, this).composeViewImplementation.getSelectedBodyText() || ''
    );
  }

  getSubject() {
    return get(memberMap, this).composeViewImplementation.getSubject();
  }

  getTextContent() {
    return get(memberMap, this).composeViewImplementation.getTextContent();
  }

  getToRecipients() {
    return get(memberMap, this).composeViewImplementation.getToRecipients();
  }

  getCcRecipients() {
    return get(memberMap, this).composeViewImplementation.getCcRecipients();
  }

  getBccRecipients() {
    return get(memberMap, this).composeViewImplementation.getBccRecipients();
  }

  insertTextIntoBodyAtCursor(text: string) {
    return get(
      memberMap,
      this
    ).composeViewImplementation.insertBodyTextAtCursor(text);
  }

  insertHTMLIntoBodyAtCursor(html: string) {
    return get(
      memberMap,
      this
    ).composeViewImplementation.insertBodyHTMLAtCursor(html);
  }

  insertLinkChipIntoBodyAtCursor(text: string, url: string, iconUrl: string) {
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

  insertLinkIntoBodyAtCursor(text: string, url: string) {
    return get(memberMap, this).composeViewImplementation.insertLinkIntoBody(
      text,
      url
    );
  }

  isForward() {
    return get(memberMap, this).composeViewImplementation.isForward();
  }

  isInlineReplyForm() {
    return get(memberMap, this).composeViewImplementation.isInlineReplyForm();
  }

  isFullscreen() {
    return get(memberMap, this).composeViewImplementation.isFullscreen();
  }

  setFullscreen(fullscreen: boolean) {
    get(memberMap, this).composeViewImplementation.setFullscreen(fullscreen);
  }

  isMinimized() {
    return get(memberMap, this).composeViewImplementation.isMinimized();
  }

  setMinimized(minimized: boolean) {
    get(memberMap, this).composeViewImplementation.setMinimized(minimized);
  }

  setTitleBarColor(color: string): () => void {
    return get(memberMap, this).composeViewImplementation.setTitleBarColor(
      color
    );
  }

  setTitleBarText(text: string): () => void {
    return get(memberMap, this).composeViewImplementation.setTitleBarText(text);
  }

  async popOut(): Promise<ComposeView> {
    const nextComposeViewDriverPromise = get(
      memberMap,
      this
    ).driver.getNextComposeViewDriver();
    get(memberMap, this).composeViewImplementation.popOut();
    const nextComposeViewDriver = await nextComposeViewDriverPromise;
    return get(memberMap, this).membrane.get(nextComposeViewDriver);
  }

  isReply() {
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
      this
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
    if (!(files[0] instanceof global.Blob)) {
      throw new Error('parameter must be an array of Blob objects');
    }
    return get(memberMap, this).composeViewImplementation.attachFiles(
      Array.from(files)
    );
  }

  async attachInlineFiles(files: Blob[]): Promise<void> {
    if (files.length === 0) {
      return;
    }
    if (!(files[0] instanceof global.Blob)) {
      throw new Error('parameter must be an array of Blob objects');
    }
    return get(memberMap, this).composeViewImplementation.attachInlineFiles(
      Array.from(files)
    );
  }

  // Old alias that we should keep around until we're sure no one is using it.
  dragFilesIntoCompose(files: Blob[]): Promise<void> {
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
  getElement() {
    return get(memberMap, this).composeViewImplementation.getElement();
  }

  registerRequestModifier(
    modifier: (composeParams: { body: string }) =>
      | { body: string }
      | Promise<{ body: string }>
  ) {
    get(memberMap, this).composeViewImplementation.registerRequestModifier(
      modifier
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
      this
    ).composeViewImplementation.ensureFormattingToolbarIsHidden();
  }

  ensureAppButtonToolbarsAreClosed() {
    get(
      memberMap,
      this
    ).composeViewImplementation.ensureAppButtonToolbarsAreClosed();
  }

  // TODO remove
  overrideEditSubject() {
    const { driver, composeViewImplementation } = get(memberMap, this);
    driver.getLogger().deprecationWarning('composeView.overrideEditSubject');
    if (driver.getOpts().REQUESTED_API_VERSION !== 1) {
      throw new Error('This method was discontinued after API version 1');
    }
    if (
      typeof (composeViewImplementation: any).overrideEditSubject === 'function'
    )
      (composeViewImplementation: any).overrideEditSubject();
  }
}

export default ud.defn(module, ComposeView);
