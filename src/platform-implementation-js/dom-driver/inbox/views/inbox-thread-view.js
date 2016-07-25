/* @flow */

import {defn} from 'ud';
import Kefir from 'kefir';
import type InboxDriver from '../inbox-driver';
import type {Parsed} from '../detection/thread/parser';

class InboxThreadView {
  _element: HTMLElement;
  _driver: InboxDriver;
  _p: Parsed;

  constructor(element: HTMLElement, driver: InboxDriver, parsed: Parsed) {
    this._element = element;
    this._driver = driver;
    this._p = parsed;
  }

  getEventStream(): any {
    return Kefir.never();
  }

  getMessageViewDrivers(): any {
    return [];
  }

  getSubject(): string {
    throw new Error('not implemented');
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

  }
}

export default defn(module, InboxThreadView);
