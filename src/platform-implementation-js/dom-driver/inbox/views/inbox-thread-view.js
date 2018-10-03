/* @flow */

import find from 'lodash/find';
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
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
import type InboxDriver from '../inbox-driver';
import type InboxMessageView from './inbox-message-view';
import type ContentPanelViewDriver from '../../../driver-common/sidebar/ContentPanelViewDriver';
import SimpleElementView from '../../../views/SimpleElementView';
import CustomMessageView from '../../../views/conversations/custom-message-view';
import parser from '../detection/thread/parser';
import type {Parsed} from '../detection/thread/parser';
import type {CustomMessageDescriptor} from '../../../views/conversations/custom-message-view';

class InboxThreadView {
  _element: HTMLElement;
  _driver: InboxDriver;
  _p: Parsed;
  _eventStream: Bus<any> = kefirBus();
  _messageViews: InboxMessageView[] = [];
  _receivedMessageView = kefirStopper();
  _stopper: Kefir.Observable<null>;
  _ready: Kefir.Observable<void>;
  _sidebarPanels: Set<ContentPanelViewDriver> = new Set();

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

    if (this.isLoadingStub()) {
      makeMutationObserverChunkedStream(this._element, {attributes: true, attributeFilter: ['aria-busy']})
        .takeUntilBy(this._stopper)
        .onValue(() => {
          if (!this.isLoadingStub()) {
            this.destroy();
          }
        });
    }
  }

  isLoadingStub(): boolean {
    return this._element.getAttribute('aria-busy') === 'true';
  }

  getEventStream(): Kefir.Observable<any> {
    return this._eventStream;
  }

  getStopper(): Kefir.Observable<null> {
    return this._stopper;
  }

  addMessageViewDriver(messageView: InboxMessageView) {
    this._messageViews.push(messageView);
    this._eventStream.plug(messageView.getEventStream()
      .filter(event => event.eventName === 'contactHover')
    );
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

  getToolbarElement(): HTMLElement {
    if (!this._p.elements.toolbar) {
      throw new Error('Failed to find toolbar');
    }
    return this._p.elements.toolbar;
  }

  getSubject(): string {
    if (!this._p.elements.heading) {
      throw new Error('Failed to find subject');
    }
    return this._p.elements.heading.textContent;
  }

  getThreadID(): string {
    const {inboxThreadId} = this._p.attributes;
    if (!inboxThreadId) {
      throw new Error('Failed to find thread id');
    }
    if (/^msg-a:/.test(inboxThreadId)) {
      console.warn('ThreadView.getThreadID() returned an incorrect thread ID. This method will be deprecated soon. Use getThreadIDAsync() instead which does not have this problem.'); //eslint-disable-line no-console
    }
    const m = /\d+$/.exec(inboxThreadId);
    if (!m) throw new Error('Should not happen');
    return new BigNumber(m[0]).toString(16);
  }

  async getThreadIDAsync(): Promise<string> {
    const {inboxThreadId} = this._p.attributes;
    if (!inboxThreadId) {
      throw new Error('Failed to find message id');
    }
    if (/^thread-a:/.test(inboxThreadId)) {
      // Get the id of any message in the thread, and then use that id in a request
      // to a gmail endpoint to get the id of the thread that message is in.
      const firstMessage = this._messageViews[0];
      if (!firstMessage) throw new Error('Should not happen');
      const messageId = await firstMessage.getMessageIDAsync();

      return await this._driver.getThreadIdFromMessageId(messageId);
    } else {
      const m = /\d+$/.exec(inboxThreadId);
      if (!m) throw new Error('Should not happen');
      return new BigNumber(m[0]).toString(16);
    }
  }

  registerHiddenCustomMessageNoticeProvider(provider: (numberCustomMessagesHidden: number, numberNativeMessagesHidden: number) => HTMLElement) {
    throw new Error('not supported');
  }

  addCustomMessage(descriptorStream: Kefir.Observable<CustomMessageDescriptor>): CustomMessageView {
    throw new Error('not supported');
  }

  addSidebarContentPanel(descriptor: Kefir.Observable<Object>) {
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

    descriptor
      .takeUntilBy(this._stopper)
      .takeUntilBy(panel.getStopper())
      .take(1)
      .onValue(descriptor => {
        const {stickyHeading} = this._p.elements;
        if (!stickyHeading) return;

        let iconArea = stickyHeading.querySelector('.'+idMap('sidebar_iconArea'));
        if (!iconArea) {
          const _iconArea = iconArea = document.createElement('div');
          iconArea.className = idMap('sidebar_iconArea');

          this._driver.getAppSidebarView().getOpenOrOpeningStream()
            .takeUntilBy(this._stopper)
            .onValue(open => {
              _iconArea.style.display = open ? 'none' : '';
            });

          stickyHeading.appendChild(iconArea);
        }

        const appName = descriptor.appName || this._driver.getOpts().appName || descriptor.title;
        const appIconUrl = descriptor.appIconUrl || this._driver.getOpts().appIconUrl || descriptor.iconUrl;

        // If there's an existing button for the app, then just increment its
        // data-count attribute instead of adding a new button.
        const existingButtonContainer = find(
          iconArea.querySelectorAll('.'+idMap('sidebar_button_container')),
          el => {
            const button = el.querySelector('button');
            if (!button || button.title !== appName) return false;
            const img = button.querySelector('img');
            if (!img || img.src !== appIconUrl) return false;
            return true;
          }
        );

        let container;
        if (existingButtonContainer) {
          const currentCount = Number(existingButtonContainer.getAttribute('data-count')) || 1;
          existingButtonContainer.setAttribute('data-count', currentCount+1);
          container = existingButtonContainer;
        } else {
          container = document.createElement('div');
          container.className = idMap('sidebar_button_container');
          container.innerHTML = autoHtml `
            <button class="inboxsdk__button_icon" type="button" title="${appName}">
              <img class="inboxsdk__button_iconImg" src="${appIconUrl}">
            </button>
          `;
          querySelector(container, 'button').addEventListener('click', (event: MouseEvent) => {
            event.stopPropagation();
            this._driver.getAppSidebarView().open();
            panel.scrollIntoView();
          }, true);
          iconArea.appendChild(container);
        }

        panel.getStopper().onValue(() => {
          const currentCount = Number(container.getAttribute('data-count'));
          if (currentCount <= 1) {
            container.remove();
          } else if (currentCount === 2) {
            container.removeAttribute('data-count');
          } else {
            container.setAttribute('data-count', String(currentCount-1));
          }
        });
      });

    return panel;
  }

  removePanels() {
    this._sidebarPanels.forEach(panel => {
      panel.remove();
    });
  }

  addNoticeBar(): SimpleElementView {
    const el = document.createElement('div');
    el.className = idMap('thread_noticeBar');

    const {heading} = this._p.elements;
    if (!heading) {
      throw new Error('Failed to find subject');
    }

    heading.insertAdjacentElement('afterend', el);
    const view = new SimpleElementView(el);

    this._stopper
      .takeUntilBy(Kefir.fromEvents(view, 'destroy'))
      .onValue(() => view.destroy());

    return view;
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
