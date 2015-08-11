/* @flow */
//jshint ignore:start

var Kefir = require('kefir');
var kefirStopper = require('kefir-stopper');
var kefirBus = require('kefir-bus');
import kefirDelayAsap from '../../../lib/kefir-delay-asap';
import simulateClick from '../../../lib/dom/simulate-click';
import simulateKey from '../../../lib/dom/simulate-key';
import type InboxDriver from '../inbox-driver';
import type {ComposeViewDriver, StatusBar} from '../../../driver-interfaces/compose-view-driver';

export default class InboxComposeView {
  _element: HTMLElement;
  _driver: InboxDriver;
  _eventStream: Kefir.Bus;
  _stopper: Kefir.Stream&{destroy:()=>void};
  _closeBtn: HTMLElement;
  _minimizeBtn: HTMLElement;
  _sendBtn: HTMLElement;
  _bodyEl: HTMLElement;
  _bodyPlaceholder: HTMLElement;
  _subjectEl: HTMLInputElement;
  _queueDraftSave: () => void;

  constructor(driver: InboxDriver, el: HTMLElement) {
    this._element = el;
    this._driver = driver;
    this._stopper = kefirStopper();
    this._eventStream = kefirBus();

    var hadError = false;
    var bottomAreaElementCount = null;
    var topBtns = this._element.querySelectorAll('div[jstcache][jsan][jsaction] > button');
    var sendBtns = this._element.querySelectorAll('div[jstcache] > div[role=button][jsan][jsaction$=".send"]');
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
    } catch(err) {
      hadError = true;
      this._driver.getLogger().error(err, {
        topBtnsLength: topBtns.length,
        sendBtnsLength: sendBtns.length,
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
  insertBodyTextAtCursor(text: string): ?HTMLElement {
    throw new Error("Not implemented");
  }
  insertBodyHTMLAtCursor(text: string): ?HTMLElement {
    throw new Error("Not implemented");
  }
  insertLinkIntoBody(text: string, href: string): ?HTMLElement {
    throw new Error("Not implemented");
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
  close(): void {
    simulateClick(this._closeBtn);
  }
  send(): void {
    simulateClick(this._sendBtn);
  }
  addButton(buttonDescriptor: Kefir.Stream, groupOrderHint: string, extraOnClickOptions?: Object): Promise<?Object> {
    buttonDescriptor.take(1).onValue(buttonDescriptor => {
      var img = document.createElement('img');
      img.className = 'inboxsdk__button_iconImg';
      img.title = buttonDescriptor.title;
      img.src = buttonDescriptor.iconUrl;
      img.addEventListener('click', () => {
        alert('clicked');
      });
      var sendParent: HTMLElement = (this._sendBtn.parentElement:any);
      sendParent.insertBefore(img, this._sendBtn.nextSibling);
    });
    return new Promise((resolve, reject) => {});
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
    throw new Error("Not implemented");
  }
  getSelectedBodyText(): ?string {
    throw new Error("Not implemented");
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
    return null;
  }
}

// This function does not get executed. It's only checked by Flow to make sure
// this class successfully implements the type interface.
function __interfaceCheck() {
  var test: ComposeViewDriver = new InboxComposeView(({}:any), document.body);
}
