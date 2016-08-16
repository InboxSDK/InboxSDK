/* @flow */

import {defn} from 'ud';
import asap from 'asap';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import delayAsap from '../../../lib/delay-asap';
import type InboxDriver from '../inbox-driver';
import type InboxThreadView from './inbox-thread-view';
import censorHTMLtree from '../../../../common/censor-html-tree';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
import InboxAttachmentCardView from './inbox-attachment-card-view';
import findParent from '../../../lib/dom/find-parent';
import parser from '../detection/message/parser';
import type {Parsed} from '../detection/message/parser';
import type {
  MessageViewDriver, MessageViewToolbarButtonDescriptor,
  MessageViewLinkDescriptor, VIEW_STATE
} from '../../../driver-interfaces/message-view-driver';

class InboxMessageView {
  _element: HTMLElement;
  _driver: InboxDriver;
  _p: Parsed;
  _stopper: Kefir.Stream<any>;
  _eventStream: Kefir.Bus<Object> = kefirBus();
  _threadViewDriver: ?InboxThreadView;
  _attachmentCardViews: InboxAttachmentCardView[] = [];

  constructor(element: HTMLElement, driver: InboxDriver, parsed: Parsed) {
    this._element = element;
    this._driver = driver;
    this._p = parsed;

    this._stopper = this._eventStream.filter(()=>false).beforeEnd(()=>null);

    // If our id changes, then destroy this view.
    // getMessageViewDriverStream() will create a new view for this element.
    makeMutationObserverChunkedStream(this._element, {
      attributes: true, attributeFilter: ['data-msg-id']
    })
      .toProperty(() => null)
      .map(() => this._element.getAttribute('data-msg-id'))
      .skipDuplicates()
      .changes()
      .onValue(() => {
        this.destroy();
      });

    makeMutationObserverChunkedStream(this._element, {
      attributes: true, attributeFilter: ['aria-expanded']
    })
      .toProperty(() => null)
      .map(() => this._element.getAttribute('aria-expanded') === 'true')
      .skipDuplicates()
      .changes()
      .takeUntilBy(this._stopper)
      .onValue(expanded => {
        if (expanded) {
          this._reparse();
        } else {
          // Destroy on collapse so that when it's uncollapsed again, the app
          // can re-do its modifications.
          this.destroy();
        }
      });

    this._threadViewDriver = this._findThreadView();
    if (this._threadViewDriver) {
      this._threadViewDriver.addMessageViewDriver(this);
    }

    this._driver.getMessageViewElementsMap().set(this._element, this);
  }

  _findThreadView(): ?InboxThreadView {
    const map = this._driver.getThreadViewElementsMap();
    const threadViewElement = findParent(this._element, el => map.has((el:any)));
    if (!threadViewElement) return null;
    return map.get(threadViewElement);
  }

  _reparse() {
    const oldParsed = this._p;
    this._p = parser(this._element);
    if (this._p.errors.length > 0) {
      this._driver.getLogger().errorSite(new Error('message reparse errors'), {
        score: this._p.score,
        errors: this._p.errors,
        html: censorHTMLtree(this._element)
      });
    }

    if (!oldParsed.attributes.loaded && this._p.attributes.loaded) {
      this._eventStream.emit({
        type: 'internal',
        eventName: 'messageLoad'
      });
    }
    if (oldParsed.attributes.viewState !== this._p.attributes.viewState) {
      this._eventStream.emit({
        eventName: 'viewStateChange',
        oldValue: oldParsed.attributes.viewState,
        newValue: this._p.attributes.viewState
      });
    }
  }

  addAttachmentCardViewDriver(card: InboxAttachmentCardView) {
    this._attachmentCardViews.push(card);
    card.getStopper()
      .takeUntilBy(this._stopper)
      .onValue(() => {
        this._attachmentCardViews = this._attachmentCardViews.filter(v => v !== card);
      });
  }

  getStopper() {
    return this._stopper;
  }

  getEventStream(): Kefir.Stream<Object> {
    return this._eventStream;
  }

  isLoaded() {
    return this._p.attributes.loaded;
  }

  hasOpenReply() {
    // Inbox associates inline replies with threads, not messages.
    return false;
  }

  getMessageID(): string {
    if (!this._p.attributes.messageId) {
      throw new Error('Failed to find message id');
    }
    return this._p.attributes.messageId;
  }

  getContentsElement() {
    if (!this._p.elements.body) throw new Error('Could not find body element');
    return this._p.elements.body;
  }

  getLinks(): Array<MessageViewLinkDescriptor> {
    throw new Error('not implemented yet');
  }
  isElementInQuotedArea(el: HTMLElement): boolean {
    const quotedArea = findParent(el, el => el.classList.contains('gmail_extra'));
    return quotedArea != null;
  }
  addMoreMenuItem(options: MessageViewToolbarButtonDescriptor): void {
    throw new Error('not implemented yet');
  }
  addAttachmentIcon(options: Object): void {
    console.warn('MessageView.addAttachmentIcon is not implemented yet in Inbox');
  }
  getAttachmentCardViewDrivers() {
    return (this._attachmentCardViews: any);
  }
  addAttachmentCard(options: Object) {
    const {attachmentsArea} = this._p.elements;
    if (!attachmentsArea) throw new Error('Could not find attachments area');
    let container = attachmentsArea.lastElementChild;
    if (!container) {
      attachmentsArea.style.display = '';
      attachmentsArea.style.margin = '16px 0 0';
      attachmentsArea.style.paddingTop = '16px';
      container = document.createElement('div');
      attachmentsArea.appendChild(container);
    }
    const card = new InboxAttachmentCardView({...options, element:null}, this._driver);
    container.appendChild(card.getElement());
    return card;
  }
  addButtonToDownloadAllArea(options: Object): void {
    // no-op in Inbox
  }
  getViewState(): VIEW_STATE {
    return this._p.attributes.viewState;
  }
  getDateString(): string {
    throw new Error('not implemented yet');
  }
  getSender(): Contact {
    const {sender} = this._p.elements;
    if (!sender)
      throw new Error('could not find sender element');
    return {
      emailAddress: sender.getAttribute('email'),
      name: sender.textContent
    };
  }
  getRecipients(): Array<Contact> {
    const userContact = this._driver.getUserContact();
    return Array.prototype.map.call(
      this._p.attributes.recipientElements,
      el => {
        const emailAddress = el.getAttribute('email');
        if (emailAddress === userContact.emailAddress) {
          return userContact;
        }
        return {
          emailAddress,
          name: el.textContent
        };
      }
    );
  }

  getThreadViewDriver() {
    if (!this._threadViewDriver) throw new Error('failed to find threadView');
    return this._threadViewDriver;
  }

  getReadyStream() {
    // Needs to emit after any attachment cards have been added in order for
    // an app calling getFileAttachmentCardViews() immediately to see the cards.
    // The cards are emitted several microtasks after the message, so we delay
    // by about 10 microtasks here. An integration test tests this at least.
    // TODO something else.
    return Kefir.repeat(i =>
      i > 10 ? null : delayAsap(null)
    ).ignoreValues().beforeEnd(() => null);
  }

  destroy() {
    this._eventStream.end();
  }
}

export default defn(module, InboxMessageView);

// This function does not get executed. It's only checked by Flow to make sure
// this class successfully implements the type interface.
function __interfaceCheck() {
	const test: MessageViewDriver = new InboxMessageView(({}:any), ({}:any), ({}:any));
}
