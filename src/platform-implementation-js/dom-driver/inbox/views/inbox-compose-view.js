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
  isRangeEmpty, getSelectedHTMLInElement, getSelectedTextInElement
} from '../../../lib/dom/get-selection';

class InboxComposeView {
  _element: HTMLElement;
  _driver: InboxDriver;
  _eventStream: Kefir.Bus;
  _stopper: Kefir.Stream&{destroy:()=>void};
  _closeBtn: ?HTMLElement;
  _minimizeBtn: ?HTMLElement;
  _sendBtn: ?HTMLElement;
  _attachBtn: ?HTMLElement;
  _popOutBtn: ?HTMLElement;
  _bodyEl: ?HTMLElement;
  _bodyPlaceholder: ?HTMLElement;
  _subjectEl: ?HTMLInputElement;
  _queueDraftSave: () => void;
  _modifierButtonContainer: ?HTMLElement;
  _lastSelectionRange: ?Range;
  _isInline: boolean;

  constructor(driver: InboxDriver, el: HTMLElement) {
    this._element = el;
    this._driver = driver;
    this._stopper = kefirStopper();
    this._eventStream = kefirBus();
    this._modifierButtonContainer = null;
    this._lastSelectionRange = null;
    this._isInline = this._element.getAttribute('role') !== 'dialog';

    const ec = new ErrorCollector('compose');
    this._sendBtn = ec.run(
      'send button',
      () => querySelectorOne(
        this._element,
        'div[jstcache] > div[role=button][jsaction$=".send"], '+
        'div[jstcache] > div[role=button][disabled]'
      )
    );
    this._attachBtn = ec.run(
      'attach button',
      () => querySelectorOne(this._element, 'div[role=button][jsaction$=".attach"]')
    );
    this._bodyEl = ec.run(
      'body',
      () => querySelectorOne(this._element, 'div[contenteditable][g_editable]')
    );
    this._subjectEl = this._isInline ? null : ec.run(
      'subject',
      () => {
        const el = querySelectorOne(this._element, 'div[jstcache][jsan] > div > input[type=text][title][jsaction^="input:"]');
        if (!(el instanceof HTMLInputElement)) throw new Error("Wrong type");
        return el;
      }
    );
    this._popOutBtn = this._isInline ? ec.run(
      'pop-out button',
      () => querySelectorOne(this._element, 'button[jsaction$=".quick_compose_popout_mole"]')
    ) : null;
    this._closeBtn = this._isInline ? null : ec.run(
      'close button',
      () => querySelectorOne(
        this._element,
        'div[jstcache][jsan][jsaction] > button[jsaction$=".close_mole"]')
    );
    this._minimizeBtn = this._isInline ? null : ec.run(
      'minimize button',
      () => querySelectorOne(
        this._element,
        'div[jstcache][jsan][jsaction] > button[jsaction$=".minimize_mole"]')
    );
    this._bodyPlaceholder = this._isInline ? null : ec.run(
      'body placeholder',
      () => {
        const el = this._bodyEl && this._bodyEl.previousElementSibling;
        if (!(el instanceof HTMLElement) || el.nodeName !== 'LABEL')
          throw new Error(`compose body placeholder wrong type ${el && el.nodeName}`);
        return el;
      }
    );
    ec.report(() => ({
      isInline: this._isInline,
      html: censorHTMLstring(this._element.outerHTML)
    }));

    const bottomAreaElementCount = this._sendBtn && this._sendBtn.parentElement && this._sendBtn.parentElement.childElementCount;

    this._driver.getLogger().eventSite('compose open', {
      errorCount: ec.errorCount(),
      bottomAreaElementCount,
      isInline: this._isInline
    });

    const draftSaveTriggerer = kefirBus();
    this._queueDraftSave = () => {draftSaveTriggerer.emit(null);};

    const bodyEl = this._bodyEl;
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
    if (this._bodyPlaceholder) {
      if (this._bodyEl && this._bodyEl.textContent.length > 0) {
        this._bodyPlaceholder.style.display = "none";
      } else {
        // To do this properly, we have to re-add whatever the visible class is.
        // It's a bit of work for a pretty minor detail (making the placeholder
        // re-appear immediately when SDK methods are used to clear a compose).
        //this._bodyPlaceholder.style.display = "";
      }
    }
    this._queueDraftSave();
  }
  focus() {
    if (!this._bodyEl) throw new Error("Compose View missing body element");
    this._bodyEl.focus();
    const selection = (document:any).getSelection();
    if (
      this._lastSelectionRange &&
      (!selection.rangeCount || isRangeEmpty(selection.getRangeAt(0)))
    ) {
      selection.removeAllRanges();
      selection.addRange(this._lastSelectionRange);
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
    if (!this._bodyEl) throw new Error("Compose View missing body element");
    this._bodyEl.innerHTML = html;
    this._informBodyChanged();
  }
  setBodyText(text: string): void {
    if (!this._bodyEl) throw new Error("Compose View missing body element");
    this._bodyEl.textContent = text;
    this._informBodyChanged();
  }
  setToRecipients(emails: string[]): void {
    throw new Error("Not implemented");
  }
  setCcRecipients(emails: string[]): void {
    throw new Error("Not implemented");
  }
  setBccRecipients(emails: string[]): void {
    throw new Error("Not implemented");
  }
  close() {
    if (this._isInline) {
      throw new Error("Not implemented for inline compose");
    }
    if (this._closeBtn) {
      simulateClick(this._closeBtn);
    }
  }
  send() {
    if (!this._sendBtn) throw new Error("Compose View missing send element");
    simulateClick(this._sendBtn);
  }
  minimize() {
    if (this._isInline) {
      throw new Error("Not implemented for inline compose views");
    }
    // TODO
  }
  restore() {
    if (this._isInline) {
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

    if (!this._isInline) {
      const hiddenAttachBtn = this._attachBtn && this._attachBtn.nextSibling;
      if (hiddenAttachBtn && hiddenAttachBtn.style && hiddenAttachBtn.style.position === 'absolute') {
        hiddenAttachBtn.style.display = 'none';
      } else {
        this._driver.getLogger().error(new Error("Didn't find hiddenAttachBtn"));
      }
    }

    const sendBtn = this._sendBtn;
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
    if (this._isInline) return true;
    throw new Error("Not implemented");
  }
  isInlineReplyForm(): boolean {
    return this._isInline;
  }
  popOut() {
    if (!this._isInline) {
      throw new Error("Can only pop out inline reply compose views");
    }
    if (!this._popOutBtn) {
      throw new Error("Should not happen");
    }
    simulateClick(this._popOutBtn);
  }
  getIsFullscreen(): boolean {
    // TODO
    return false;
  }
  getBodyElement(): HTMLElement {
    if (!this._bodyEl) throw new Error("Compose View missing body element");
    return this._bodyEl;
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
    if (!this._subjectEl) {
      throw new Error("InboxSDK: Could not locate subject field");
    }
    return this._subjectEl.value;
  }
  setSubject(text: string): void {
    if (this._isInline) {
      throw new Error("setSubject is not supported for inline compose views");
    }
    if (!this._subjectEl) {
      throw new Error("InboxSDK: Could not locate subject field");
    }
    this._subjectEl.value = text;
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
  const test: ComposeViewDriver = new InboxComposeView(({}:any), document.body);
}
