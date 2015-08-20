/* @flow */
//jshint ignore:start

var _ = require('lodash');
var RSVP = require('rsvp');
var Kefir = require('kefir');
var kefirStopper = require('kefir-stopper');
var kefirBus = require('kefir-bus');
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

export default class InboxComposeView {
  _element: HTMLElement;
  _driver: InboxDriver;
  _eventStream: Kefir.Bus;
  _stopper: Kefir.Stream&{destroy:()=>void};
  _closeBtn: HTMLElement;
  _minimizeBtn: HTMLElement;
  _sendBtn: HTMLElement;
  _attachBtn: HTMLElement;
  _formatBtn: HTMLElement;
  _bodyEl: HTMLElement;
  _bodyPlaceholder: HTMLElement;
  _subjectEl: HTMLInputElement;
  _queueDraftSave: () => void;
  _modifierButtonContainer: ?HTMLElement;
  _lastSelectionRange: ?Range;

  constructor(driver: InboxDriver, el: HTMLElement) {
    this._element = el;
    this._driver = driver;
    this._stopper = kefirStopper();
    this._eventStream = kefirBus();
    this._modifierButtonContainer = null;
    this._lastSelectionRange = null;

    var hadError = false;
    var bottomAreaElementCount = null;
    var topBtns = this._element.querySelectorAll('div[jstcache][jsan][jsaction] > button');
    var sendBtns = this._element.querySelectorAll('div[jstcache] > div[role=button][jsan][jsaction$=".send"]');
    var attachBtns = this._element.querySelectorAll('div[jstcache] > div[role=button][jsan][jsaction$=".attach"]');
    var formatBtns = this._element.querySelectorAll('div[jstcache] > div > div[jsan][jsaction$=".open_format_bar;"]');
    var bodyEls = this._element.querySelectorAll('div[jstcache][jsan] > div > div[contenteditable][role=textbox]');
    var subjectEls = this._element.querySelectorAll('div[jstcache][jsan] > div > input[type=text][title][jsaction^="input:"]');
    try {
      if (topBtns.length !== 2)
        throw new Error("compose wrong number of top buttons");
      if (!/\.close_mole$/.test(topBtns[0].getAttribute('jsaction')))
        throw new Error("compose close button wrong jsaction")
      this._closeBtn = topBtns[0];
      if (!/\.minimize_mole$/.test(topBtns[1].getAttribute('jsaction')))
        throw new Error("compose minimize button wrong jsaction")
      this._minimizeBtn = topBtns[1];
      if (sendBtns.length !== 1)
        throw new Error("compose wrong number of send buttons");
      this._sendBtn = sendBtns[0];
      var bottomArea: HTMLElement = (this._sendBtn.parentElement:any);
      bottomAreaElementCount = bottomArea.childElementCount;
      if (attachBtns.length !== 1)
        throw new Error("compose wrong number of attach buttons");
      this._attachBtn = attachBtns[0];
      if (bodyEls.length !== 1)
        throw new Error("compose wrong number of body elements");
      this._bodyEl = bodyEls[0];
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
      if (formatBtns.length !== 1)
        throw new Error("compose wrong number of format buttons");
      this._formatBtn = formatBtns[0];
    } catch(err) {
      hadError = true;
      this._driver.getLogger().error(err, {
        topBtnsLength: topBtns.length,
        sendBtnsLength: sendBtns.length,
        attachBtnsLength: attachBtns.length,
        formatBtnsLength: formatBtns.length,
        bodyElsLength: bodyEls.length,
        subjectElsLength: subjectEls.length
      });
    }

    this._driver.getLogger().eventSite('compose open', {hadError, bottomAreaElementCount});

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
    if (this._bodyEl.textContent.length > 0) {
      this._bodyPlaceholder.style.display = "none";
    } else {
      // To do this properly, we have to re-add whatever the visible class is.
      // It's a bit of work for a pretty minor detail (making the placeholder
      // re-appear immediately when SDK methods are used to clear a compose).
      //this._bodyPlaceholder.style.display = "";
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
  // returns the format area if it's found and open
  _getFormatArea(): ?HTMLElement {
    var formatArea = this._element.querySelector('div[jstcache] > div > div[jsan][jsaction$=".open_format_bar;"] + div > div');
    if (formatArea && formatArea.children.length > 1) {
      return formatArea;
    }
    return null;
  }
  insertLinkIntoBody(text: string, href: string): ?HTMLElement {
    this.focus();
    var formatArea = this._getFormatArea();
    var formatAreaOpenAtStart = !!formatArea;
    if (!formatArea) {
      simulateClick(this._formatBtn);
      formatArea = this._getFormatArea();
    }
    if (!formatArea) throw new Error("Couldn't open format area");
    try {
      var linkButton = formatArea.querySelector('div[role=button][id$="link"]');
      if (!linkButton) throw new Error("Couldn't find link button");
      simulateClick(linkButton);
      var dialog = document.body.querySelector('body > div[role=dialog]');
      if (!dialog) {
        // If the cursor was next to a link, then the first click unlinks that.
        // Same thing in Gmail. TODO fix.
        simulateClick(linkButton);
        dialog = document.body.querySelector('body > div[role=dialog]');
      }
      if (!dialog) throw new Error("Couldn't find dialog");
      var ok = dialog.querySelector('button[name=ok]');
      if (!ok) throw new Error("Couldn't find ok");
      var textInput = dialog.querySelector('input#linkdialog-text');
      if (!textInput || !(textInput instanceof HTMLInputElement))
        throw new Error("Couldn't find text input");
      var urlInput = dialog.querySelector('input[type=url]');
      if (!urlInput || !(urlInput instanceof HTMLInputElement))
        throw new Error("Couldn't find url input");
      textInput.value = text;
      textInput.dispatchEvent(new Event("input"));
      urlInput.value = href;
      urlInput.dispatchEvent(new Event("input"));
      simulateClick(ok);
    } finally {
      if (!formatAreaOpenAtStart) {
        simulateClick(this._formatBtn);
      }
    }
    this._informBodyChanged();
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
    simulateClick(this._closeBtn);
  }
  send() {
    simulateClick(this._sendBtn);
  }
  minimize() {
    // TODO
  }
  restore() {
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

    var hiddenAttachBtn = this._attachBtn.nextSibling;
    if (hiddenAttachBtn && hiddenAttachBtn.style.position === 'absolute') {
      hiddenAttachBtn.style.display = 'none';
    } else {
      this._driver.getLogger().error(new Error("Didn't find hiddenAttachBtn"));
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
    throw new Error("Not implemented");
  }
  isInlineReplyForm(): boolean {
    // inline reply form support isn't in yet, so it can't be one.
    return false;
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
    return this._subjectEl.value;
  }
  setSubject(text: string): void {
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
  addTooltipToButton(buttonViewController: Object, buttonDescriptor: Object, tooltipDescriptor: TooltipDescriptor) {
    (buttonViewController:InboxComposeButtonView).showTooltip(tooltipDescriptor);
  }
  closeButtonTooltip(buttonViewController: Object) {
    (buttonViewController:InboxComposeButtonView).closeTooltip();
  }
}

// This function does not get executed. It's only checked by Flow to make sure
// this class successfully implements the type interface.
function __interfaceCheck() {
  var test: ComposeViewDriver = new InboxComposeView(({}:any), document.body);
}
