/* @flow */

import {defn} from 'ud';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';

class InboxAppToolbarTooltipView {
  _stopper: Kefir.Stream&{destroy():void} = kefirStopper();
  _contentEl: HTMLElement;
  _containerEl: HTMLElement;

  constructor() {
    this._containerEl = document.createElement('div');
    this._containerEl.className = 'inboxsdk__appButton_tooltip';

    this._contentEl = document.createElement('div');
    this._contentEl.className = 'inboxsdk__appButton_tooltip_content';
    this._containerEl.appendChild(this._contentEl);
  }

  getContentElement() {
    return this._contentEl;
  }
  getContainerElement() {
    return this._containerEl;
  }

  destroy() {
    this._stopper.destroy();
  }
}

export default defn(module, InboxAppToolbarTooltipView);
