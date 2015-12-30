/* @flow */
//jshint ignore:start

var _ = require('lodash');
var ud = require('ud');
var RSVP = require('rsvp');
var Kefir = require('kefir');
var kefirStopper = require('kefir-stopper');
var kefirBus = require('kefir-bus');
var autoHtml = require('auto-html');
import censorHTMLstring from '../../../../common/censor-html-string';
import kefirDelayAsap from '../../../lib/kefir-delay-asap';
import kefirMakeMutationObserverChunkedStream from '../../../lib/dom/kefir-make-mutation-observer-chunked-stream';
import simulateClick from '../../../lib/dom/simulate-click';
import simulateKey from '../../../lib/dom/simulate-key';
import insertHTMLatCursor from '../../../lib/dom/insert-html-at-cursor';
import handleComposeLinkChips from '../../../lib/handle-compose-link-chips';
import insertLinkChipIntoBody from '../../../lib/insert-link-chip-into-body';
import type InboxDriver from '../inbox-driver';
import type {TooltipDescriptor} from '../../../views/compose-button-view';
import InboxComposeButtonView from './inbox-compose-button-view';
import type {ComposeViewDriver, StatusBar, ComposeButtonDescriptor} from '../../../driver-interfaces/compose-view-driver';
import {
  isRangeEmpty, getSelectedHTMLInElement, getSelectedTextInElement
} from '../../../lib/dom/get-selection';

var InboxComposeView = ud.defn(module, class InboxComposeView {
  _element: HTMLElement;
  _driver: InboxDriver;
  _eventStream: Kefir.Bus;
  _stopper: Kefir.Stream&{destroy:()=>void};
  _closeBtn: ?HTMLElement;
  _minimizeBtn: ?HTMLElement;
  _sendBtn: HTMLElement;
  _attachBtn: HTMLElement;
  _popOutBtn: ?HTMLElement;
  _bodyEl: HTMLElement;
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
    this._isInline = /\.quick_compose_focus$/.test(this._element.getAttribute('jsaction'));

    var hadError = false;
    var bottomAreaElementCount = null;
    var sendBtns = this._element.querySelectorAll(
      'div[jstcache] > div[role=button][jsaction$=".send"], '+
      'div[jsaction] > div[role=button][disabled]');
    var attachBtns = this._element.querySelectorAll(
      'div[role=button][jsaction$=".attach"]');
    var bodyEls = this._element.querySelectorAll(
      'div[contenteditable][g_editable][role=textbox]');

    var popOutBtns = this._isInline ? this._element.querySelectorAll('button[jsaction$=".quick_compose_popout_mole"]') : [];

    var topBtns = !this._isInline ? this._element.querySelectorAll('div[jstcache][jsan][jsaction] > button') : [];
    var subjectEls = !this._isInline ? this._element.querySelectorAll('div[jstcache][jsan] > div > input[type=text][title][jsaction^="input:"]') : [];

    try {
      if (bodyEls.length !== 1)
        throw new Error("compose wrong number of body elements");
      this._bodyEl = bodyEls[0];
      if (sendBtns.length !== 1)
        throw new Error("compose wrong number of send buttons");
      this._sendBtn = sendBtns[0];
      var bottomArea: HTMLElement = (this._sendBtn.parentElement:any);
      bottomAreaElementCount = bottomArea.childElementCount;
      if (attachBtns.length !== 1)
        throw new Error("compose wrong number of attach buttons");
      this._attachBtn = attachBtns[0];
      if (this._isInline) {
        this._closeBtn = null;
        this._minimizeBtn = null;
        this._bodyPlaceholder = null;
        this._subjectEl = null;
        if (popOutBtns.length !== 1)
          throw new Error("compose wrong number pop out buttons");
        this._popOutBtn = popOutBtns[0];
      } else {
        if (topBtns.length !== 2)
          throw new Error("compose wrong number of top buttons");
        if (!/\.close_mole$/.test(topBtns[0].getAttribute('jsaction')))
          throw new Error("compose close button wrong jsaction")
        this._closeBtn = topBtns[0];
        if (!/\.minimize_mole$/.test(topBtns[1].getAttribute('jsaction')))
          throw new Error("compose minimize button wrong jsaction")
        this._minimizeBtn = topBtns[1];
        var bodyPlaceholder = this._bodyEl.previousElementSibling;
        if (!(bodyPlaceholder instanceof HTMLElement) || bodyPlaceholder.nodeName !== 'LABEL')
          throw new Error(`compose body placeholder wrong type ${bodyPlaceholder && bodyPlaceholder.nodeName}`);
        this._bodyPlaceholder = bodyPlaceholder;
        if (subjectEls.length !== 1)
          throw new Error("compose wrong number of subject elements");
        var subjectEl = subjectEls[0];
        if (!(subjectEl instanceof HTMLInputElement))
          throw new Error(`compose subject wrong type ${subjectEl && subjectEl.nodeName}`);
        this._subjectEl = subjectEl;
        this._popOutBtn = null;
      }
    } catch(err) {
      hadError = true;
      this._driver.getLogger().error(err, {
        isInline: this._isInline,
        topBtnsLength: topBtns.length,
        sendBtnsLength: sendBtns.length,
        attachBtnsLength: attachBtns.length,
        bodyElsLength: bodyEls.length,
        subjectElsLength: subjectEls.length,
        html: censorHTMLstring(this._element.innerHTML)
      });
    }

    this._driver.getLogger().eventSite('compose open', {
      hadError, bottomAreaElementCount,
      isInline: this._isInline
    });

    var draftSaveTriggerer = kefirBus();
    this._queueDraftSave = () => {draftSaveTriggerer.emit(null);};
    draftSaveTriggerer
      .bufferBy(draftSaveTriggerer.flatMap(() => kefirDelayAsap(null)))
      .filter(x => x.length > 0)
      .takeUntilBy(this._stopper)
      .onValue(() => {
        var unsilence = this._driver.getPageCommunicator().silenceGmailErrorsForAMoment();
        try {
          simulateKey(this.getBodyElement(), 13, 0);
        } finally {
          unsilence();
        }
      });

    Kefir.merge([
        Kefir.fromEvents(document.body, 'mousedown'),
        Kefir.fromEvents(document.body, 'keydown')
      ]).takeUntilBy(this.getStopper())
      .onValue(event => {
        var body = this.getBodyElement();
        var selection = (document:any).getSelection();
        if (body && selection.rangeCount > 0 && body.contains(selection.anchorNode)) {
          this._lastSelectionRange = selection.getRangeAt(0);
        }
      });

    this._eventStream.plug(
      kefirMakeMutationObserverChunkedStream(this._bodyEl, {childList: true, subtree: true, characterData: true})
        .map(() => ({eventName: 'bodyChanged'}))
    );

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
      if (this._bodyEl.textContent.length > 0) {
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
    this._bodyEl.focus();
    var selection = (document:any).getSelection();
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
    this._bodyEl.innerHTML = html;
    this._informBodyChanged();
  }
  setBodyText(text: string): void {
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
    var div = document.createElement('div');
    div.className = 'inboxsdk__compose_actionToolbar';

    if (!this._isInline) {
      var hiddenAttachBtn = this._attachBtn.nextSibling;
      if (hiddenAttachBtn && hiddenAttachBtn.style.position === 'absolute') {
        hiddenAttachBtn.style.display = 'none';
      } else {
        this._driver.getLogger().error(new Error("Didn't find hiddenAttachBtn"));
      }
    }

    var sendParent = this._sendBtn.parentElement;
    if (!sendParent) throw new Error("Could not find send button parent");
    sendParent.insertBefore(div, this._sendBtn.nextSibling);

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
});
export default InboxComposeView;

// This function does not get executed. It's only checked by Flow to make sure
// this class successfully implements the type interface.
function __interfaceCheck() {
  var test: ComposeViewDriver = new InboxComposeView(({}:any), document.body);
}
