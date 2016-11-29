/* @flow */

import _ from 'lodash';
import {defn} from 'ud';
import autoHtml from 'auto-html';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type {Bus} from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import delayAsap from '../../../lib/delay-asap';
import idMap from '../../../lib/idMap';
import type InboxDriver from '../inbox-driver';
import type InboxMessageView from './inbox-message-view';
import type ContentPanelViewDriver from '../../../driver-common/sidebar/ContentPanelViewDriver';
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
          iconArea = document.createElement('div');
          iconArea.className = idMap('sidebar_iconArea');

          this._driver.getAppSidebarView().getOpenOrOpeningStream()
            .takeUntilBy(this._stopper)
            .onValue(open => {
              iconArea.style.display = open ? 'none' : '';
            });

          stickyHeading.appendChild(iconArea);
        }

        const appName = descriptor.appName || this._driver.getOpts().appName || descriptor.title;
        const appIconUrl = descriptor.appIconUrl || this._driver.getOpts().appIconUrl || descriptor.iconUrl;

        // If there's an existing button for the app, then just increment its
        // data-count attribute instead of adding a new button.
        const existingButtonContainer = _.find(
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
          container.querySelector('button').addEventListener('click', (event: MouseEvent) => {
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

  getReadyStream() {
    return this._ready;
  }

  destroy() {
    this._driver.getThreadViewElementsMap().delete(this._element);
    this._eventStream.end();
  }
}

export default defn(module, InboxThreadView);
