/* @flow */

import _ from 'lodash';
import {defn} from 'ud';
import RSVP from 'rsvp';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import kefirBus from 'kefir-bus';
import type {Bus} from 'kefir-bus';
import autoHtml from 'auto-html';
import censorHTMLstring from '../../../../common/censor-html-string';
import delayAsap from '../../../lib/delay-asap';
import arrayToLifetimes from '../../../lib/array-to-lifetimes';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
import simulateClick from '../../../lib/dom/simulate-click';
import simulateKey from '../../../lib/dom/simulate-key';
import insertHTMLatCursor from '../../../lib/dom/insert-html-at-cursor';
import querySelectorOne from '../../../lib/dom/querySelectorOne';
import ErrorCollector from '../../../lib/ErrorCollector';
import handleComposeLinkChips from '../../../lib/handle-compose-link-chips';
import insertLinkChipIntoBody from '../../../lib/insert-link-chip-into-body';
import getPresendingStream from '../../../driver-common/compose/getPresendingStream';
import getDiscardStream from '../../../driver-common/compose/getDiscardStream';
import type InboxDriver from '../inbox-driver';
import type {TooltipDescriptor} from '../../../views/compose-button-view';
import InboxComposeButtonView from './inbox-compose-button-view';
import type {ComposeViewDriver, StatusBar, ComposeButtonDescriptor} from '../../../driver-interfaces/compose-view-driver';
import {
  getSelectedHTMLInElement, getSelectedTextInElement
} from '../../../lib/dom/get-selection';

import type {Parsed} from '../detection/compose/parser';

let cachedFromContacts: ?Array<Contact> = null;

class InboxComposeView {
  _element: HTMLElement;
  _driver: InboxDriver;
  _eventStream: Bus<any> = kefirBus();
  _ajaxInterceptStream: Kefir.Observable<Object>;
  _sendingStream: ?Kefir.Observable<Object>;
  _stopper = kefirStopper();
  _queueDraftSave: () => void;
  _modifierButtonContainer: ?HTMLElement;
  _lastBodySelectionRange: ?Range;
  _draftID: string;
  _isMinimized: boolean = false;
  _isFullscreenMode: boolean = false;
  _isPresending: boolean = false;
  _p: Parsed;
  _els: *;

  constructor(driver: InboxDriver, el: HTMLElement, parsed: Parsed) {
    (this: ComposeViewDriver);
    this._element = el;
    this._driver = driver;
    this._modifierButtonContainer = null;
    this._lastBodySelectionRange = null;
    this._p = parsed;
    this._els = parsed.elements;

    const bottomAreaElementCount = this._els.sendBtn && this._els.sendBtn.parentElement && this._els.sendBtn.parentElement.childElementCount;

    this._driver.getLogger().eventSite('compose open', {
      errorCount: this._p.errors.length,
      bottomAreaElementCount,
      isInline: this._p.attributes.isInline
    });

    const draftSaveTriggerer = kefirBus();
    this._queueDraftSave = () => {draftSaveTriggerer.emit(null);};

    const bodyEl = this._els.body;
    if (bodyEl) {
      draftSaveTriggerer
        .bufferBy(draftSaveTriggerer.flatMap(() => delayAsap(null)))
        .filter(x => x.length > 0)
        .takeUntilBy(this._stopper)
        .onValue(() => {
          var unsilence = this._driver.getPageCommunicator().silenceGmailErrorsForAMoment();
          try {
            simulateKey(bodyEl, 13, 0);
          } finally {
            unsilence();
          }
        });

      Kefir.merge([
          Kefir.fromEvents((document.body:any), 'mousedown'),
          Kefir.fromEvents((document.body:any), 'keydown')
        ]).takeUntilBy(this.getStopper())
        .onValue(event => {
          const selection = (document:any).getSelection();
          if (selection.rangeCount > 0 && bodyEl.contains(selection.anchorNode)) {
            this._lastBodySelectionRange = selection.getRangeAt(0);
          }
        });

      this._eventStream.plug(
        makeMutationObserverChunkedStream(bodyEl, {childList: true, subtree: true, characterData: true})
          .map(() => ({eventName: 'bodyChanged'}))
      );
    }

    this._draftID = this._driver.getPageCommunicator().getDraftIDForComposeView(
      this.getElement()
    );

    this._ajaxInterceptStream = this._driver
      .getPageCommunicator()
      .ajaxInterceptStream
      .takeUntilBy(this._stopper)
      .filter(({draftID}) => draftID === this._draftID);

    this._setupStreams();

    this.getEventStream()
      .takeUntilBy(this._stopper)
      .onValue(({eventName}) => {
        if (eventName === 'presending') {
          this._isPresending = true;

          const sendCanceledStream = this.getEventStream()
            .filter(({eventName}) => eventName === 'sendCanceled');

          this._sendingStream = Kefir.merge([
            Kefir.combine([
              this.getEventStream().filter(({eventName}) => eventName === 'sending'),
              this.getEventStream().filter(({eventName}) => eventName === 'sent')
            ]),
            this._ajaxInterceptStream.filter(({type}) => type === 'emailSendFailed'),
            Kefir.later(60 * 1000).flatMap(() => Kefir.constantError(
              new Error('Timed out waiting for ComposeView send')
            ))
          ]).takeUntilBy(sendCanceledStream).takeUntilBy(this._stopper).take(1).takeErrors(1);

          this._sendingStream.onValue(() => {
            this._isPresending = false;
          }).onError((error) => {
            this._driver.getLogger().error(error);
          });
          this._driver.getPageCommunicator().notifyEmailSending();
          if (!this._p.attributes.isInline) {
            Kefir.later(15)
              .takeUntilBy(sendCanceledStream)
              .onValue(() => {
                // In cases where Inbox decides to cancel the send client-side,
                // we need to make sure we realize sending is not going to happen
                // and inform consumers who might be expecting a send.
                // The most common case for this is trying to send an email
                // with no recipients.
                if (document.contains(this._element)) {
                  this._eventStream.emit({eventName: 'sendCanceled'});
                }
              });
          }
        } else if (eventName === 'sendCanceled') {
          this._isPresending = false;
          this._driver.getPageCommunicator().notifyEmailSendCanceled();
        }
      });

    handleComposeLinkChips(this);

    const {fromPickerEmailSpan} = this._els;
    if (fromPickerEmailSpan) {
      this._eventStream.plug(
        makeMutationObserverChunkedStream(fromPickerEmailSpan, {childList: true, subtree: true, characterData: true})
          .map(() => ({
            eventName: 'fromContactChanged',
            data: {contact: this.getFromContact()}
          }))
      );
    }

    const {minimizeBtnImage} = this._els;
    if (minimizeBtnImage) {
      function isMinimized() {
        return /_maximize_/.test(minimizeBtnImage.src);
      }
      const minimizeButtonChanges = makeMutationObserverChunkedStream(minimizeBtnImage, {attributes: true});
      minimizeButtonChanges
        .toProperty(() => null)
        .takeUntilBy(this._stopper)
        .onValue(() => {
          this._isMinimized = isMinimized();
        });
      this._eventStream.plug(
        minimizeButtonChanges.map(() => ({
          eventName: isMinimized() ? 'minimized' : 'restored'
        }))
      );
    }

    const {toggleFullscreenButtonImage} = this._els;
    if (toggleFullscreenButtonImage) {
      function isFullscreenMode() {
        return !/_enter_full_screen/.test(toggleFullscreenButtonImage.src);
      }
      const toggleButtonChanges = makeMutationObserverChunkedStream(toggleFullscreenButtonImage, {attributes: true});
      toggleButtonChanges
        .toProperty(() => null)
        .takeUntilBy(this._stopper)
        .onValue(() => {
          this._isFullscreenMode = isFullscreenMode();
        });
      this._eventStream.plug(
        toggleButtonChanges.map(() => ({
          eventName: 'fullscreenChanged',
          data: {fullscreen: isFullscreenMode()}
        }))
      );
    }
  }
  removedFromDOM() {
    const cleanup = () => {
      this._eventStream.emit({eventName: 'destroy', data: {}});
      this._eventStream.end();
      this._stopper.destroy();
    };

    if (this._isPresending) {
      this._sendingStream && this._sendingStream.onEnd(cleanup);
    } else {
      cleanup();
    }
  }
  getEventStream(): Kefir.Observable<Object> {return this._eventStream;}
  getStopper(): Kefir.Observable<null> {return this._stopper;}
  getElement(): HTMLElement {return this._element;}
  // Call this whenever we change the body directly by mucking with the
  // elements.
  _informBodyChanged() {
    if (this._els.bodyPlaceholder) {
      if (this._els.body && this._els.body.textContent.length > 0) {
        this._els.bodyPlaceholder.style.display = "none";
      } else {
        // To do this properly, we have to re-add whatever the visible class is.
        // It's a bit of work for a pretty minor detail (making the placeholder
        // re-appear immediately when SDK methods are used to clear a compose).
        //this._els.bodyPlaceholder.style.display = "";
      }
    }
    this._queueDraftSave();
  }
  _getAddressChangesStream() {
    const {toInput, ccInput, bccInput} = this._els;

    function makeChangesStream(prefix, input, cb) {
      if (!input) return Kefir.never();
      const contactArrayStream =
        makeMutationObserverChunkedStream(
          (input:any).parentElement, {childList: true, attributes: true, subtree: true}
        )
        .merge(Kefir.later(0))
        .map(cb);
      return arrayToLifetimes(contactArrayStream, c => c.emailAddress)
        .flatMap(({el, removalStream}) =>
          Kefir.constant({eventName: prefix+'ContactAdded', data: {contact: el}})
            .merge(
              removalStream.map(() => ({
                eventName: prefix+'ContactRemoved', data: {contact: el}
              }))
            )
        );
    }

    return Kefir.merge([
      makeChangesStream('to', toInput, () => this.getToRecipients()),
      makeChangesStream('cc', ccInput, () => this.getCcRecipients()),
      makeChangesStream('bcc', bccInput, () => this.getBccRecipients())
    ]).takeUntilBy(this._stopper);
  }
  _setupStreams() {
    this._eventStream.plug(this._getAddressChangesStream());

    this._eventStream.plug(getPresendingStream({
      element: this.getElement(),
      sendButton: this.getSendButton()
    }));

    this._eventStream.plug(getDiscardStream({
      element: this.getElement(),
      discardButton: this.getDiscardButton()
    }));

    this._eventStream.plug(
      Kefir
        .fromEvents(this.getElement(), 'inboxSDKsendCanceled')
        .map(() => ({eventName: 'sendCanceled'}))
    );

    this._eventStream.plug(
      Kefir
        .fromEvents(this.getElement(), 'inboxSDKdiscardCanceled')
        .map(() => ({eventName: 'discardCanceled'}))
    );

    this._eventStream.plug(
      this._ajaxInterceptStream
        .filter(({type}) => type === 'emailSending')
        .map(() => ({eventName: 'sending'}))
    );

    this._eventStream.plug(
      this._ajaxInterceptStream
        .filter(({type}) => type === 'emailSent')
        .map(() => ({eventName: 'sent'}))
    );
  }
  getFromContact(): Contact {
    const {fromPickerEmailSpan} = this._els;
    if (!fromPickerEmailSpan) {
      return this._driver.getUserContact();
    }
    const email = fromPickerEmailSpan.textContent;
    const contact = _.find(this.getFromContactChoices(), c => c.emailAddress === email);
    if (!contact) {
      throw new Error('Failed to find from contact');
    }
    return contact;
  }
  getFromContactChoices(): Contact[] {
    if (this._p.attributes.isInline) throw new Error("Can't get from values of inline compose");
    if (cachedFromContacts) {
      return cachedFromContacts;
    }
    const {fromPicker} = this._els;
    if (!fromPicker) {
      cachedFromContacts = [this._driver.getUserContact()];
      return cachedFromContacts;
    }
    const startActiveElement = document.activeElement;

    const grandUncle: HTMLElement = (this._element:any).parentElement.parentElement.firstElementChild;
    let fromOptionEls = grandUncle.querySelectorAll('li[role=menuitem][data-jsaction*=".switch_custom_from"]');

    const needToOpenMenu = (fromOptionEls.length === 0);

    try {
      if (needToOpenMenu) {
        simulateClick(fromPicker);
        fromOptionEls = grandUncle.querySelectorAll('li[role=menuitem][data-jsaction*=".switch_custom_from"]');
      }

      if (fromOptionEls.length === 0) {
        cachedFromContacts = [this._driver.getUserContact()];
        return cachedFromContacts;
      }

      cachedFromContacts = _.chain(fromOptionEls)
        .map(el => ({
          name: el.querySelector('span[title]').title,
          emailAddress: el.querySelector('span:not([title])').textContent
        }))
        .value();
    } finally {
      if (needToOpenMenu) {
        simulateClick((document.body:any));
      }
      if (startActiveElement) {
        startActiveElement.focus();
      }
    }
    return cachedFromContacts;
  }
  setFromEmail(email: string): void {
    if (this._p.attributes.isInline) throw new Error("Can't set from value of inline compose");
    if (this.getFromContact().emailAddress === email) return;

    const {fromPicker} = this._els;
    if (!fromPicker) throw new Error('from picker element not found');

    const startActiveElement = document.activeElement;

    const grandUncle: HTMLElement = (this._element:any).parentElement.parentElement.firstElementChild;
    let fromOptionEls = grandUncle.querySelectorAll('li[role=menuitem][data-jsaction*=".switch_custom_from"]');

    const needToOpenMenu = (fromOptionEls.length === 0);
    try {
      if (needToOpenMenu) {
        simulateClick(fromPicker);
        fromOptionEls = grandUncle.querySelectorAll('li[role=menuitem][data-jsaction*=".switch_custom_from"]');
      }
      const fromOptionEl = _.find(fromOptionEls, el =>
        el.querySelector('span:not([title])').textContent === email
      );
      if (!fromOptionEl) {
        throw new Error('Failed to find from contact to set');
      }
      simulateClick(fromOptionEl);
    } finally {
      if (needToOpenMenu) {
        simulateClick(fromPicker);
      }
      if (startActiveElement) {
        startActiveElement.focus();
      }
    }
  }
  focus() {
    if (!this._els.body) throw new Error("Compose View missing body element");
    this._els.body.focus();
    const selection = document.getSelection();
    const lastSelectionRange = this._lastBodySelectionRange;
    if (
      lastSelectionRange && selection
    ) {
      selection.removeAllRanges();
      selection.addRange(lastSelectionRange);
    }
  }
  insertBodyTextAtCursor(text: string): ?HTMLElement {
    return this.insertBodyHTMLAtCursor(_.escape(text).replace(/\n/g, '<br>'));
  }
  insertBodyHTMLAtCursor(html: string): ?HTMLElement {
    var retVal = insertHTMLatCursor(this.getBodyElement(), html, this._lastBodySelectionRange);
    this._informBodyChanged();
    return retVal;
  }
  insertLinkIntoBody(text: string, href: string): ?HTMLElement {
    var html = autoHtml `<a href="${href}">${text}</a>`;
    return this.insertBodyHTMLAtCursor(html);
  }
  insertLinkChipIntoBody(options: {iconUrl?: string, url: string, text: string}): HTMLElement {
    var retval = insertLinkChipIntoBody(this, options);
    this._informBodyChanged();
    return retval;
  }
  setBodyHTML(html: string): void {
    if (!this._els.body) throw new Error("Compose View missing body element");
    this._els.body.innerHTML = html;
    this._informBodyChanged();
  }
  setBodyText(text: string): void {
    if (!this._els.body) throw new Error("Compose View missing body element");
    this._els.body.textContent = text;
    this._informBodyChanged();
  }
  _setRecipients(inputElement: HTMLInputElement, emails: string[]) {
    const chipContainer = inputElement.parentElement;
    if (!chipContainer) throw new Error("Should not happen");

    const startActiveElement = document.activeElement;

    // Inbox re-uses the chip elements as some are removed, so finding all the
    // button elements at once and then clicking on each of them wouldn't work.
    const removeButtonCount = chipContainer.querySelectorAll('[role=button][jsaction*="remove_chip"]').length;
    for (let i=0; i<removeButtonCount; i++) {
      const removeButton = chipContainer.querySelector('[role=button][jsaction*="remove_chip"]');
      if (!removeButton) break;
      simulateClick(removeButton);
    }

    emails.forEach(email => {
      inputElement.value = email;
      inputElement.dispatchEvent(new window.FocusEvent("blur"));
    });

    if (startActiveElement) {
      startActiveElement.focus();
    }
  }
  setToRecipients(emails: string[]): void {
    if (this._p.attributes.isInline) throw new Error("Can't set recipients of inline compose");
    const {toInput} = this._els;
    if (!toInput) throw new Error("Compose View missing recipient input");
    this._setRecipients(toInput, emails);
  }
  setCcRecipients(emails: string[]): void {
    if (this._p.attributes.isInline) throw new Error("Can't set recipients of inline compose");
    const {ccInput} = this._els;
    if (!ccInput) throw new Error("Compose View missing recipient input");
    this._setRecipients(ccInput, emails);
    const {toggleCcBccButton} = this._els;
    if (emails.length && toggleCcBccButton && toggleCcBccButton.style.display !== 'none') {
      simulateClick(toggleCcBccButton);
    }
  }
  setBccRecipients(emails: string[]): void {
    if (this._p.attributes.isInline) throw new Error("Can't set recipients of inline compose");
    const {bccInput} = this._els;
    if (!bccInput) throw new Error("Compose View missing recipient input");
    this._setRecipients(bccInput, emails);
    const {toggleCcBccButton} = this._els;
    if (emails.length && toggleCcBccButton && toggleCcBccButton.style.display !== 'none') {
      simulateClick(toggleCcBccButton);
    }
  }
  close() {
    if (this._p.attributes.isInline) {
      throw new Error("Not implemented for inline compose");
    }
    if (this._els.closeBtn) {
      simulateClick(this._els.closeBtn);
    }
  }
  send() {
    if (!this._els.sendBtn) throw new Error("Compose View missing send element");
    simulateClick(this._els.sendBtn);
  }
  discard() {
    simulateClick(this.getDiscardButton());
  }
  setMinimized(minimized: boolean) {
    if (minimized !== this.isMinimized()) {
      if (this._p.attributes.isInline)
        throw new Error("Not implemented for inline compose views");
      const {minimizeBtn} = this._els;
      if (!minimizeBtn) throw new Error('Could not find minimize button');
      minimizeBtn.click();
    }
  }
  setFullscreen(fullscreen: boolean) {
    if (fullscreen !== this.isFullscreen()) {
      if (this._p.attributes.isInline)
        throw new Error("Not implemented for inline compose views");
      const {toggleFullscreenButton} = this._els;
      if (!toggleFullscreenButton) throw new Error('Could not find fullscreen button');
      toggleFullscreenButton.click();
    }
  }
  addButton(buttonDescriptor: Kefir.Observable<?ComposeButtonDescriptor>, groupOrderHint: string, extraOnClickOptions: Object): Promise<?Object> {
    var buttonViewController = new InboxComposeButtonView(this, buttonDescriptor, groupOrderHint, extraOnClickOptions);
    return RSVP.Promise.resolve({
      buttonViewController,
      buttonDescriptor: {}
    });
  }
  getModifierButtonContainer(): HTMLElement {
    if (this._modifierButtonContainer) {
      return this._modifierButtonContainer;
    }
    this._modifierButtonContainer = this._element.querySelector('.inboxsdk__compose_actionToolbar');
    if (this._modifierButtonContainer) {
      return this._modifierButtonContainer;
    }
    const div = document.createElement('div');
    div.className = 'inboxsdk__compose_actionToolbar';

    if (!this._p.attributes.isInline) {
      const hiddenAttachBtn = this._els.attachBtn ? this._els.attachBtn.nextSibling : null;
      if (hiddenAttachBtn instanceof HTMLElement && hiddenAttachBtn.style.position === 'absolute') {
        hiddenAttachBtn.style.display = 'none';
      } else {
        this._driver.getLogger().error(new Error("Didn't find hiddenAttachBtn"));
      }
    }

    const sendBtn = this._els.sendBtn;
    if (!sendBtn) throw new Error("Compose View missing send element");
    const sendParent = sendBtn.parentElement;
    if (!sendParent) throw new Error("Could not find send button parent");
    sendParent.insertBefore(div, sendBtn.nextSibling);

    this._modifierButtonContainer = div;
    return div;
  }
  addRecipientRow(options: Kefir.Observable<?Object>): () => void {
    throw new Error("Not implemented");
  }
  addOuterSidebar(options: {title: string, el: HTMLElement}): void {
    throw new Error("Not implemented");
  }
  addInnerSidebar(options: {el: HTMLElement}): void {
    throw new Error("Not implemented");
  }
  addStatusBar(options?: {height?: number, orderHint?: number}): StatusBar {
    throw new Error("Not implemented");
  }
  isReply(): boolean {
    if (this._p.attributes.isInline) return true;
    throw new Error("Not implemented");
  }
  isInlineReplyForm(): boolean {
    return this._p.attributes.isInline;
  }
  popOut() {
    if (!this._p.attributes.isInline) {
      throw new Error("Can only pop out inline reply compose views");
    }
    if (!this._els.popOutBtn) {
      throw new Error("Should not happen");
    }
    simulateClick(this._els.popOutBtn);
  }
  registerRequestModifier(modifier: Object): void {
    throw new Error("Not implemented");
  }
  attachFiles(files: Blob[]): Promise<void> {
    throw new Error("Not implemented");
  }
  attachInlineFiles(files: Blob[]): Promise<void> {
    throw new Error("Not implemented");
  }
  isFullscreen(): boolean {
    return this._isFullscreenMode;
  }
  isMinimized(): boolean {
    return this._isMinimized;
  }
  getBodyElement(): HTMLElement {
    if (!this._els.body) throw new Error("Compose View missing body element");
    return this._els.body;
  }
  getHTMLContent(): string {
    return this.getBodyElement().innerHTML;
  }
  getTextContent(): string {
    return this.getBodyElement().textContent;
  }
  getSelectedBodyHTML(): ?string {
    return getSelectedHTMLInElement(this.getBodyElement(), this._lastBodySelectionRange);
  }
  getSelectedBodyText(): ?string {
    return getSelectedTextInElement(this.getBodyElement(), this._lastBodySelectionRange);
  }
  getSubject(): string {
    const {subject} = this._els;
    if (!subject) {
      throw new Error("InboxSDK: Could not locate subject field");
    }
    return subject.value;
  }
  setSubject(text: string): void {
    if (this._p.attributes.isInline) {
      throw new Error("setSubject is not supported for inline compose views");
    }
    if (!this._els.subject) {
      throw new Error("InboxSDK: Could not locate subject field");
    }
    this._els.subject.value = text;
  }
  _getRecipients(inputElement: HTMLElement): Contact[] {
    const chipContainer = inputElement.parentElement;
    if (!chipContainer) throw new Error("Should not happen");

    return _.chain(chipContainer.children)
      .filter(el =>
        el.nodeName === 'DIV' && el.hasAttribute('email') && el.style.display !== 'none'
      )
      .map(chip => ({
        emailAddress: chip.getAttribute('email'),
        name: chip.textContent
      }))
      .value();
  }
  getToRecipients(): Contact[] {
    if (this._p.attributes.isInline) throw new Error("Can't get recipients of inline compose");
    const {toInput} = this._els;
    if (!toInput) throw new Error("Compose View missing recipient input");
    return this._getRecipients(toInput);
  }
  getCcRecipients(): Contact[] {
    if (this._p.attributes.isInline) throw new Error("Can't get recipients of inline compose");
    const {ccInput} = this._els;
    if (!ccInput) throw new Error("Compose View missing recipient input");
    return this._getRecipients(ccInput);
  }
  getBccRecipients(): Contact[] {
    if (this._p.attributes.isInline) throw new Error("Can't get recipients of inline compose");
    const {bccInput} = this._els;
    if (!bccInput) throw new Error("Compose View missing recipient input");
    return this._getRecipients(bccInput);
  }
  getComposeID(): string {
    throw new Error("This method was discontinued");
  }
  getInitialMessageID(): ?string {
    throw new Error("composeView.getInitialMessageID is not implemented in Inbox")
  }
  getMessageID(): ?string {
    throw new Error("composeView.getMessageID is not implemented in Inbox")
  }
  getThreadID(): ?string {
    // TODO
    return null;
  }
  getCurrentDraftID(): Promise<?string> {
    return Promise.resolve(this._draftID);
  }
  getDraftID(): Promise<?string> {
    return Promise.resolve(this._draftID);
  }
  addTooltipToButton(buttonViewController: Object, buttonDescriptor: Object, tooltipDescriptor: TooltipDescriptor) {
    (buttonViewController:InboxComposeButtonView).showTooltip(tooltipDescriptor);
  }
  closeButtonTooltip(buttonViewController: Object) {
    (buttonViewController:InboxComposeButtonView).closeTooltip();
  }
  getDiscardButton(): HTMLElement {
    if (!this._els.discardBtn) throw new Error('Compose View missing discard button');
    return this._els.discardBtn;
  }
  getSendButton(): HTMLElement {
    if (!this._els.sendBtn) throw new Error('Compose View missing send button');
    return this._els.sendBtn;
  }
}

export default defn(module, InboxComposeView);
