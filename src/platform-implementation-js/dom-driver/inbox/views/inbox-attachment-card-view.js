/* @flow */

import _ from 'lodash';
import {defn} from 'ud';
import autoHtml from 'auto-html';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import type InboxDriver from '../inbox-driver';

class InboxAttachmentCardView {
  _stopper = kefirStopper();
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
      Kefir.merge([
        Kefir.fromEvents(this._element, 'click'),
        Kefir.fromEvents(this._element, 'keypress').filter(e => _.includes([32/*space*/, 13/*enter*/], e.which))
      ]).onValue(event => {
        event.preventDefault();
        alert('foo');
      });
    }
  }

  destroy() {
    this._stopper.destroy();
  }

  getElement() {
    return this._element;
  }

  getStopper(): Kefir.Stream {
    return this._stopper;
  }

  getPreviewClicks(): Kefir.Stream {
    //TODO
    return Kefir.never();
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
