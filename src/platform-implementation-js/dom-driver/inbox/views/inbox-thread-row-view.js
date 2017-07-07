/* @flow */

import _ from 'lodash';
import {defn} from 'ud';
import autoHtml from 'auto-html';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type {Bus} from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import BigNumber from 'bignumber.js';
import delayAsap from '../../../lib/delay-asap';
import idMap from '../../../lib/idMap';
import querySelector from '../../../lib/dom/querySelectorOrFail';
import type InboxDriver from '../inbox-driver';
import type {Parsed} from '../detection/thread-row/parser';

class InboxThreadRowView {
  _element: HTMLElement;
  _driver: InboxDriver;
  _p: Parsed;
  _userView: ?Object;
  _eventStream: Bus<any> = kefirBus();
  _stopper: Kefir.Observable<null>;

  constructor(element: HTMLElement, driver: InboxDriver, parsed: Parsed) {
    this._element = element;
    this._driver = driver;
    this._p = parsed;

    this._stopper = this._eventStream.ignoreValues().beforeEnd(()=>null).toProperty();
  }

  getEventStream(): Kefir.Observable<any> {
    return this._eventStream;
  }

  getStopper(): Kefir.Observable<null> {
    return this._stopper;
  }

  // keeping this here for now since the rest of the system expects it.
  // in Gmail it's used to pass a ThreadRowView interface to addButton()
  // onClick callbacks, but not sure if it will be needed in the end.
  setUserView(userView: Object) {
    this._userView = userView;
  }

  addAttachmentIcon() {
    throw new Error('Not supported in Inbox');
  }

  addButton() {
    throw new Error('Not supported in Inbox');
  }

  addActionButton() {
    throw new Error('not yet implemented');
  }

  addImage() {
    throw new Error('not yet implemented');
  }

  addLabel() {
    throw new Error('not yet implemented');
  }

  getDateString() {
    throw new Error('not yet implemented');
  }

  getSubject() {
    if (!this._p.elements.subject) {
      throw new Error('Failed to find subject');
    }
    return this._p.elements.subject.textContent;
  }

  getThreadID() {
    throw new Error('not yet implemented');
  }

  async getThreadIDAsync(): Promise<string> {
    // dummy return val for now.
    return Promise.resolve('');
  }

  getDraftID() {
    throw new Error('not yet implemented');
  }

  getVisibleDraftCount() {
    throw new Error('not yet implemented');
  }

  getVisibleMessageCount() {
    throw new Error('not yet implemented');
  }

  getContacts() {
    throw new Error('not yet implemented');
  }

  replaceDate() {
    throw new Error('Not supported in Inbox');
  }

  replaceDraftLabel() {
    throw new Error('not yet implemented');
  }

  destroy() {
    this._eventStream.end();
  }
}

export default defn(module, InboxThreadRowView);
