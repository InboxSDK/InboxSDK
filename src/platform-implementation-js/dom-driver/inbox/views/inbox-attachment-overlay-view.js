/* @flow */

import {defn} from 'ud';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import autoHtml from 'auto-html';

import sharedStyle from '../../../lib/shared-style';
import customStyle from '../../../dom-driver/inbox/custom-style';
import {simulateClick} from '../../../lib/dom/simulate-mouse-event';
import ajax from '../../../../common/ajax';

import type InboxDriver from '../inbox-driver';
import type {Parsed} from '../detection/attachmentOverlay/parser';
import type InboxAttachmentCardView from './inbox-attachment-card-view';

class InboxAttachmentOverlayView {
  _driver: InboxDriver;
  _el: HTMLElement;
  _p: Parsed;
  _cardView: InboxAttachmentCardView;
  _stopper: Kefir.Observable<null>&{destroy():void} = kefirStopper();

  constructor(driver: InboxDriver, el: HTMLElement, parsed: Parsed, cardView: InboxAttachmentCardView) {
    this._driver = driver;
    this._el = el;
    this._p = parsed;
    this._cardView = cardView;

    // The element is within a same-origin iframe
    sharedStyle(el.ownerDocument);
    customStyle(el.ownerDocument);

    this._cardView.setOverlay(this);

    this._cardView.getAddedButtonDescriptors().forEach(button => {
      this.addButton(button);
    });
  }

  destroy() {
    this._cardView.setOverlay(null);
    this._stopper.destroy();
  }

  getStopper(): Kefir.Observable<null> {
    return this._stopper;
  }

  addButton(button: Object) {
    const {downloadButton, buttonContainer} = this._p.elements;
    if (!buttonContainer) throw new Error('Missing buttonContainer, can not add button');

    const el = document.createElement('button');
    el.className = 'inboxsdk__attachment_overlay_button';
    el.addEventListener('click', (event: MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      if (button.onClick) {
        button.onClick({
          getDownloadURL: () => this.getDownloadURL()
        });
      }
    });
    el.innerHTML = autoHtml `
      <img src="${button.iconUrl}">
    `;
    el.setAttribute('data-tooltip-delay', '500');
    el.setAttribute('data-tooltip-unhoverable', 'true');
    if (downloadButton) {
      el.setAttribute('data-tooltip-class', downloadButton.getAttribute('data-tooltip-class') || '');
      el.setAttribute('data-tooltip-align', downloadButton.getAttribute('data-tooltip-align') || '');
    }
    el.setAttribute('aria-label', button.tooltip);
    el.setAttribute('data-tooltip', button.tooltip);

    buttonContainer.insertBefore(el, buttonContainer.lastElementChild);
    this._stopper.onValue(() => {
      el.remove();
    });
  }

  async getDownloadURL(): Promise<?string> {
    const {downloadButton} = this._p.elements;
    if (!downloadButton) throw new Error('Could not find download button element');
    const src = await this._driver.getPageCommunicator().clickAndGetNewIframeSrc(downloadButton);
    const {xhr} = await ajax({url: src, method: 'HEAD'});
    const url = (xhr:any).responseURL;
    return url;
  }
}

export default defn(module, InboxAttachmentOverlayView);
