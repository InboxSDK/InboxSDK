/* @flow */

import _ from 'lodash';
import {defn} from 'ud';
import RSVP from 'rsvp';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import kefirBus from 'kefir-bus';
import autoHtml from 'auto-html';
import censorHTMLstring from '../../../../common/censor-html-string';
import delayAsap from '../../../lib/delay-asap';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
import simulateClick from '../../../lib/dom/simulate-click';
import simulateKey from '../../../lib/dom/simulate-key';
import insertHTMLatCursor from '../../../lib/dom/insert-html-at-cursor';
import querySelectorOne from '../../../lib/dom/querySelectorOne';
import ErrorCollector from '../../../lib/ErrorCollector';
import handleComposeLinkChips from '../../../lib/handle-compose-link-chips';
import insertLinkChipIntoBody from '../../../lib/insert-link-chip-into-body';
import type InboxDriver from '../inbox-driver';
import type {TooltipDescriptor} from '../../../views/compose-button-view';
import InboxComposeButtonView from './inbox-compose-button-view';
import type {ComposeViewDriver, StatusBar, ComposeButtonDescriptor} from '../../../driver-interfaces/compose-view-driver';
import {
  getSelectedHTMLInElement, getSelectedTextInElement
} from '../../../lib/dom/get-selection';

import type {Parsed} from '../detection/compose/parser';

class InboxComposeView {
  _element: HTMLElement;
  _driver: InboxDriver;
  _eventStream: Kefir.Bus;
  _stopper: Kefir.Stream&{destroy:()=>void};
  _queueDraftSave: () => void;
  _modifierButtonContainer: ?HTMLElement;
  _lastSelectionRange: ?Range;
  _p: Parsed;
  _els: Parsed.elements;

  constructor(driver: InboxDriver, el: HTMLElement, parsed: Parsed) {
    this._element = el;
    this._driver = driver;
    this._stopper = kefirStopper();
    this._eventStream = kefirBus();
    this._modifierButtonContainer = null;
    this._lastSelectionRange = null;
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
          Kefir.fromEvents(document.body, 'mousedown'),
          Kefir.fromEvents(document.body, 'keydown')
        ]).takeUntilBy(this.getStopper())
        .onValue(event => {
          const selection = (document:any).getSelection();
          if (selection.rangeCount > 0 && bodyEl.contains(selection.anchorNode)) {
            this._lastSelectionRange = selection.getRangeAt(0);
          }
        });

      this._eventStream.plug(
        makeMutationObserverChunkedStream(bodyEl, {childList: true, subtree: true, characterData: true})
          .map(() => ({eventName: 'bodyChanged'}))
      );
    }

    handleComposeLinkChips(this);
  }
  destroy() {
    this._eventStream.emit({eventName: 'destroy', data: {}});
    this._eventStream.end();
    this._stopper.destroy();
  }
  getEventStream(): Kefir.Stream {return this._eventStream;}
  getStopper(): Kefir.Stream {return this._stopper;}
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
  getFromContact(): Contact {
    throw new Error("Not implemented");
  }
  getFromContactChoices(): Contact[] {
    throw new Error("Not implemented");
  }
  setFromEmail(email: string): void {
    throw new Error("Not implemented");
  }
  focus() {
    if (!this._els.body) throw new Error("Compose View missing body element");
    this._els.body.focus();
    const selection = document.getSelection();
    const lastSelectionRange = this._lastSelectionRange;
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
    var retVal = insertHTMLatCursor(this.getBodyElement(), html, this._lastSelectionRange);
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

    const selection = document.getSelection();
    const lastSelectionRange = this._lastSelectionRange;
    if (
      lastSelectionRange && selection
    ) {
      selection.removeAllRanges();
      selection.addRange(lastSelectionRange);
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
  minimize() {
    if (this._p.attributes.isInline) {
      throw new Error("Not implemented for inline compose views");
    }
    // TODO
  }
  restore() {
    if (this._p.attributes.isInline) {
      throw new Error("Not implemented for inline compose views");
    }
    // TODO
  }
  addButton(buttonDescriptor: Kefir.Stream<?ComposeButtonDescriptor>, groupOrderHint: string, extraOnClickOptions: Object): Promise<?Object> {
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
      const hiddenAttachBtn = this._els.attachBtn && this._els.attachBtn.nextSibling;
      if (hiddenAttachBtn && hiddenAttachBtn.style && hiddenAttachBtn.style.position === 'absolute') {
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
  addRecipientRow(options: Kefir.Stream): () => void {
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
  getIsFullscreen(): boolean {
    if (this._p.attributes.isInline) return false;
    const {toggleFullscreenButtonImage} = this._els;
    if (!toggleFullscreenButtonImage) return false;
    return !/_enter_full_screen/.test(toggleFullscreenButtonImage.src);
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
    return getSelectedHTMLInElement(this.getBodyElement(), this._lastSelectionRange);
  }
  getSelectedBodyText(): ?string {
    return getSelectedTextInElement(this.getBodyElement(), this._lastSelectionRange);
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
  getToRecipients(): Contact[] {
    throw new Error("Not implemented");
  }
  getCcRecipients(): Contact[] {
    throw new Error("Not implemented");
  }
  getBccRecipients(): Contact[] {
    throw new Error("Not implemented");
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
    throw new Error("Not yet implemented");
  }
  getDraftID(): Promise<?string> {
    throw new Error("Not yet implemented");
  }
  addTooltipToButton(buttonViewController: Object, buttonDescriptor: Object, tooltipDescriptor: TooltipDescriptor) {
    (buttonViewController:InboxComposeButtonView).showTooltip(tooltipDescriptor);
  }
  closeButtonTooltip(buttonViewController: Object) {
    (buttonViewController:InboxComposeButtonView).closeTooltip();
  }
}

export default defn(module, InboxComposeView);

// This function does not get executed. It's only checked by Flow to make sure
// this class successfully implements the type interface.
function __interfaceCheck() {
  const test: ComposeViewDriver = new InboxComposeView(({}:any), document.body, ({}:any));
}
