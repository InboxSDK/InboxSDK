/* @flow */

import {defn} from 'ud';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type InboxDriver from '../inbox-driver';
import type InboxMessageView from './inbox-message-view';
import type {Parsed} from '../detection/thread/parser';

class InboxThreadView {
  _element: HTMLElement;
  _driver: InboxDriver;
  _p: Parsed;
  _eventStream: Kefir.Bus = kefirBus();
  _messageViews: InboxMessageView[] = [];
  _stopper: Kefir.Stream;

  constructor(element: HTMLElement, driver: InboxDriver, parsed: Parsed) {
    this._element = element;
    this._driver = driver;
    this._p = parsed;

    this._stopper = this._eventStream.filter(()=>false).beforeEnd(()=>null);

    this._driver.getThreadViewElementsMap().set(this._element, this);
  }

  getEventStream(): Kefir.Stream {
    return this._eventStream;
  }

  addMessageViewDriver(messageView: InboxMessageView) {
    this._messageViews.push(messageView);
    messageView.getStopper()
      .takeUntilBy(this._stopper)
      .onValue(() => {
        this._messageViews = this._messageViews.filter(m => m !== messageView);
      });
  }

  getMessageViewDrivers() {
    return this._messageViews;
  }

  getSubject(): string {
    if (!this._p.elements.heading) {
      throw new Error('Failed to find subject');
    }
    return this._p.elements.heading.textContent;
  }

  getThreadID(): string {
    if (!this._p.attributes.threadId) {
      throw new Error('Failed to find thread id');
    }
    return this._p.attributes.threadId;
  }

  addSidebarContentPanel(descriptor: any, appId: string) {
    throw new Error('not implemented');
  }

  destroy() {
    this._driver.getThreadViewElementsMap().delete(this._element);
    this._eventStream.end();
  }
}

export default defn(module, InboxThreadView);
