/* @flow */

import {defn} from 'ud';
import autoHtml from 'auto-html';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type InboxDriver from '../inbox-driver';

class InboxAttachmentCardView {
  _bus: Kefir.Bus = kefirBus();
  _element: HTMLElement;
  _driver: InboxDriver;

  constructor(options, driver: InboxDriver) {
    this._driver = driver;
    if (options.element) {
      throw new Error('not implemented yet');
    } else {
      this._element = document.createElement('div');
      this._element.tabIndex = '0';
      this._element.title = options.title;
      this._element.className = 'u2 k9';
      this._element.innerHTML = autoHtml `
        <div class="ga oY">
          <div class="lT r6 tQ">${options.title}</div>
          <div class="tx lT">
            <img alt="" aria-hidden="true" src="${options.fileIconImageUrl}" class="i">
            <span style="display:none"></span>
            <span class="l0">${options.description || ''}</span>
          </div>
        </div>
      `;
    }
  }

  destroy() {
    this._bus.end();
  }

  getElement() {
    return this._element;
  }

  getEventStream(): Kefir.Stream {
    return this._bus;
  }

  getAttachmentType(): string {
    throw new Error('not implemented yet');
  }

  addButton(options: Object): void {
    throw new Error('not implemented yet');
  }

  getTitle(): string {
    return this._element.title;
  }

  async getDownloadURL(): Promise<?string> {
    throw new Error('not implemented yet');
  }
}

export default defn(module, InboxAttachmentCardView);
