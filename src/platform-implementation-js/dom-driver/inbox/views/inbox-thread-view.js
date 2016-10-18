/* @flow */

import {defn} from 'ud';
import autoHtml from 'auto-html';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type {Bus} from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import delayAsap from '../../../lib/delay-asap';
import type InboxDriver from '../inbox-driver';
import type InboxMessageView from './inbox-message-view';
import type InboxSidebarContentPanelView from './inbox-sidebar-content-panel-view';
import parser from '../detection/thread/parser';
import type {Parsed} from '../detection/thread/parser';

class InboxThreadView {
  _element: HTMLElement;
  _driver: InboxDriver;
  _p: Parsed;
  _eventStream: Bus<any> = kefirBus();
  _messageViews: InboxMessageView[] = [];
  _receivedMessageView = kefirStopper();
  _stopper: Kefir.Observable<null>;
  _ready: Kefir.Observable<void>;
  _sidebarPanels: Set<InboxSidebarContentPanelView> = new Set();

  constructor(element: HTMLElement, driver: InboxDriver, parsed: Parsed) {
    this._element = element;
    this._driver = driver;
    this._p = parsed;

    this._stopper = this._eventStream.ignoreValues().beforeEnd(()=>null).toProperty();

    this._driver.getThreadViewElementsMap().set(this._element, this);

    this._ready = this._receivedMessageView
      .flatMap(() => delayAsap())
      .onValue(() => {
        this._p = parser(this._element);
      })
      .toProperty();
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

  addSidebarContentPanel(descriptor: Kefir.Observable<Object>) {
    let icon = null;
    const panel = this._driver.getAppSidebarView().addSidebarContentPanel(descriptor);
    this._sidebarPanels.add(panel);
    panel.getStopper()
      .onValue(() => {
        if (icon) icon.remove();
        this._sidebarPanels.delete(panel);
      });
    this._stopper
      .takeUntilBy(panel.getStopper())
      .onValue(() => {
        panel.remove();
      });

    descriptor
      .takeUntilBy(this._stopper)
      .takeUntilBy(panel.getStopper())
      .take(1)
      .onValue(descriptor => {
        const {stickyHeading} = this._p.elements;
        if (!stickyHeading) return;

        let iconArea = stickyHeading.querySelector('.inboxsdk__sidebar_iconArea');
        if (!iconArea) {
          iconArea = document.createElement('div');
          iconArea.className = 'inboxsdk__sidebar_iconArea';

          this._driver.getAppSidebarView().getOpenOrOpeningStream()
            .takeUntilBy(this._stopper)
            .onValue(open => {
              iconArea.style.display = open ? 'none' : '';
            });

          stickyHeading.appendChild(iconArea);
        }

        let {appName, appIconUrl} = this._driver.getOpts();
        if (!appName) {
          appName = descriptor.title;
        }
        if (!appIconUrl) {
          appIconUrl = descriptor.iconUrl;
        }

        icon = document.createElement('div');
        icon.innerHTML = autoHtml `
          <button class="inboxsdk__button_icon" type="button" title="${appName}">
            <img class="inboxsdk__button_iconImg" src="${appIconUrl}">
          </button>
        `;
        icon.querySelector('button').addEventListener('click', event => {
          event.stopPropagation();
          this._driver.getAppSidebarView().open();
          panel.scrollIntoView();
        }, true);
        iconArea.appendChild(icon);
      });

    return panel;
  }

  removePanels() {
    this._sidebarPanels.forEach(panel => {
      panel.remove();
    });
  }

  getReadyStream() {
    return this._ready;
  }

  destroy() {
    this._driver.getThreadViewElementsMap().delete(this._element);
    this._eventStream.end();
  }
}

export default defn(module, InboxThreadView);
