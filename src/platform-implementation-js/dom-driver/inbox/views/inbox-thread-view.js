/* @flow */

import {defn} from 'ud';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type InboxDriver from '../inbox-driver';
import type {Parsed} from '../detection/thread/parser';

class InboxThreadView {
  _element: HTMLElement;
  _driver: InboxDriver;
  _p: Parsed;
  _eventStream: Kefir.Bus = kefirBus();

  constructor(element: HTMLElement, driver: InboxDriver, parsed: Parsed) {
    this._element = element;
    this._driver = driver;
    this._p = parsed;
  }

  getEventStream(): Kefir.Stream {
    return this._eventStream;
  }

  getMessageViewDrivers(): any {
    return [];
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
    this._eventStream.end();
  }
}

export default defn(module, InboxThreadView);
