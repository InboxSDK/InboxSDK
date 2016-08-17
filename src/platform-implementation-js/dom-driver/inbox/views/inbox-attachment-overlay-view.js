/* @flow */

import {defn} from 'ud';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import type InboxDriver from '../inbox-driver';
import type {Parsed} from '../detection/attachmentOverlay/parser';
import type InboxAttachmentCardView from './inbox-attachment-card-view';

class InboxAttachmentOverlayView {
  _driver: InboxDriver;
  _el: HTMLElement;
  _p: Parsed;
  _cardView: InboxAttachmentCardView;
  _stopper: Kefir.Stream<null>&{destroy():void} = kefirStopper();

  constructor(driver: InboxDriver, el: HTMLElement, parsed: Parsed, cardView: InboxAttachmentCardView) {
    this._driver = driver;
    this._el = el;
    this._p = parsed;
    this._cardView = cardView;

    console.log('attachmentOverlay', this._el, this._p, this._cardView.getElement());
  }

  destroy() {
    console.log('attachmentOverlay destroy', this._el, this._p);
    this._stopper.destroy();
  }

  getStopper(): Kefir.Stream<null> {
    return this._stopper;
  }
}

export default defn(module, InboxAttachmentOverlayView);
