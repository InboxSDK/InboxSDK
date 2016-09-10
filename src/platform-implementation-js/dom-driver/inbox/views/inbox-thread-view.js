/* @flow */

import {defn} from 'ud';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type {Bus} from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import delayAsap from '../../../lib/delay-asap';
import type InboxDriver from '../inbox-driver';
import type InboxMessageView from './inbox-message-view';
import type InboxSidebarContentPanelView from './inbox-sidebar-content-panel-view';
import type {Parsed} from '../detection/thread/parser';

class InboxThreadView {
  _element: HTMLElement;
  _driver: InboxDriver;
  _p: Parsed;
  _eventStream: Bus<any> = kefirBus();
  _messageViews: InboxMessageView[] = [];
  _receivedMessageView = kefirStopper();
  _stopper: Kefir.Observable<null>;
  _sidebarPanels: Set<InboxSidebarContentPanelView> = new Set();

  constructor(element: HTMLElement, driver: InboxDriver, parsed: Parsed) {
    this._element = element;
    this._driver = driver;
    this._p = parsed;

    this._stopper = this._eventStream.ignoreValues().beforeEnd(()=>null).toProperty();

    this._driver.getThreadViewElementsMap().set(this._element, this);
  }

  getEventStream(): Kefir.Observable<any> {
    return this._eventStream;
  }

  getStopper(): Kefir.Observable<null> {
    return this._stopper;
  }

  addMessageViewDriver(messageView: InboxMessageView) {
    this._messageViews.push(messageView);
    messageView.getStopper()
      .takeUntilBy(this._stopper)
      .onValue(() => {
        this._messageViews = this._messageViews.filter(m => m !== messageView);
      });
    this._receivedMessageView.destroy();
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

  addSidebarContentPanel(descriptor: any) {
    const panel = this._driver.getAppSidebarView().addSidebarContentPanel(descriptor);
    this._sidebarPanels.add(panel);
    panel.getStopper()
      .onValue(() => {
        this._sidebarPanels.delete(panel);
      });
    this._stopper
      .takeUntilBy(panel.getStopper())
      .onValue(() => {
        panel.remove();
      });
    return panel;
  }

  removePanels() {
    this._sidebarPanels.forEach(panel => {
      panel.remove();
    });
  }

  getReadyStream() {
    return this._receivedMessageView.flatMap(() => delayAsap());
  }

  destroy() {
    this._driver.getThreadViewElementsMap().delete(this._element);
    this._eventStream.end();
  }
}

export default defn(module, InboxThreadView);
