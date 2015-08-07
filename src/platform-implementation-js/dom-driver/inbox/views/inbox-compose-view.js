/* @flow */
//jshint ignore:start

var Kefir = require('kefir');
var kefirStopper = require('kefir-stopper');
var kefirBus = require('kefir-bus');
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

  constructor(driver: InboxDriver, el: HTMLElement) {
    this._element = el;
    this._driver = driver;
    this._stopper = kefirStopper();
    this._eventStream = kefirBus();

    var hadError = false;
    var bottomAreaElementCount = null;
    var topBtns = this._element.querySelectorAll('div[jstcache][jsan][jsaction] > button');
    var sendBtns = this._element.querySelectorAll('div[jstcache] > div[role=button][jsan][jsaction$=".send"]');
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
    } catch(err) {
      hadError = true;
      this._driver.getLogger().error(err, {
        topBtnsLength: topBtns.length,
        sendBtnsLength: sendBtns.length
      });
    }

    this._driver.getLogger().eventSite('compose open', {hadError, bottomAreaElementCount});
  }
  destroy() {
    this._eventStream.end();
    this._stopper.destroy();
  }
  getEventStream(): Kefir.Stream {return this._eventStream;}
  getStopper(): Kefir.Stream {return this._stopper;}
  getElement(): HTMLElement {return this._element;}
  insertBodyTextAtCursor(text: string): ?HTMLElement {
    throw new Error("Not implemented");
  }
  insertBodyHTMLAtCursor(text: string): ?HTMLElement {
    throw new Error("Not implemented");
  }
  insertLinkIntoBody(text: string, href: string): ?HTMLElement {
    throw new Error("Not implemented");
  }
  setSubject(text: string): void {
    throw new Error("Not implemented");
  }
  setBodyHTML(text: string): void {
    throw new Error("Not implemented");
  }
  setBodyText(text: string): void {
    throw new Error("Not implemented");
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
    throw new Error("Not implemented");
  }
  addButton(buttonDescriptor: Kefir.Stream, groupOrderHint: string, extraOnClickOptions?: Object): Promise<?Object> {
    // stub
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
    throw new Error("Not implemented");
  }
  getBodyElement(): HTMLElement {
    throw new Error("Not implemented");
  }
  getHTMLContent(): string {
    throw new Error("Not implemented");
  }
  getTextContent(): string {
    throw new Error("Not implemented");
  }
  getSelectedBodyHTML(): ?string {
    throw new Error("Not implemented");
  }
  getSelectedBodyText(): ?string {
    throw new Error("Not implemented");
  }
  getSubject(): string {
    throw new Error("Not implemented");
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
    throw new Error("Not implemented");
  }
  getMessageID(): ?string {
    // stub
    return null;
  }
  getThreadID(): ?string {
    // stub
    return null;
  }
}

// This function does not get executed. It's only checked by Flow to make sure
// this class successfully implements the type interface.
function __interfaceCheck() {
  var test: ComposeViewDriver = new InboxComposeView(({}:any), document.body);
}
