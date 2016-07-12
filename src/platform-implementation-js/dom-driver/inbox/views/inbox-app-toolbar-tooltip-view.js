/* @flow */

import {defn} from 'ud';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';

class InboxAppToolbarTooltipView {
  _stopper: Kefir.Stream&{destroy():void} = kefirStopper();
  _el: HTMLElement;

  constructor() {
    this._el = document.createElement('div');
    this._el.className = 'inboxsdk__appButton_tooltip';
    this._el.setAttribute('role', 'region');
  }

  getContentElement() {
    return this._el;
  }
  getContainerElement() {
    return this._el;
  }

  destroy() {
    this._stopper.destroy();
  }
}

export default defn(module, InboxAppToolbarTooltipView);
