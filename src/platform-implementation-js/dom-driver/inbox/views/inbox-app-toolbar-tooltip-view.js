/* @flow */

import {defn} from 'ud';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';

class InboxAppToolbarTooltipView {
  _stopper: Kefir.Stream&{destroy():void} = kefirStopper();
  _anchorElement: HTMLElement;
  _el: HTMLElement;
  _containerEl: HTMLElement;
  _arrowEl: HTMLElement;

  constructor(anchorElement: HTMLElement, arrowColor: ?string) {
    this._anchorElement = anchorElement;

    this._arrowEl = document.createElement('div');
    this._arrowEl.className = 'inboxsdk__tooltip_arrow inboxsdk__bottom';
    document.body.appendChild(this._arrowEl);
    if (arrowColor) {
      this._arrowEl.style.borderColor = arrowColor;
    }

    this._containerEl = document.createElement('div');
    this._containerEl.className = 'inboxsdk__appButton_tooltip_container';

    this._el = document.createElement('div');
    this._el.className = 'inboxsdk__appButton_tooltip';
    this._el.setAttribute('role', 'region');

    this._containerEl.appendChild(this._el);
    document.body.appendChild(this._containerEl);

    this._reposition();
  }

  _reposition() {
    const buttonPos = this._anchorElement.getBoundingClientRect();
    const buttonCenter = buttonPos.left+buttonPos.width/2;
    this._arrowEl.style.top = `${buttonPos.bottom+18}px`;
    this._arrowEl.style.right = `${(window.innerWidth-buttonPos.right)+buttonPos.width/2-this._arrowEl.offsetWidth/2-1}px`;

    this._containerEl.style.top = `${buttonPos.bottom+17}px`;
    this._containerEl.style.minWidth = `${(window.innerWidth-buttonCenter-30)*2}px`;
  }

  getDropdownOptions() {
    return {
      manualPosition: true,
      extraElementsToIgnore: [this._arrowEl]
    };
  }
  getContentElement() {
    return this._el;
  }
  getContainerElement() {
    return this._containerEl;
  }

  destroy() {
    this._containerEl.remove();
    this._arrowEl.remove();
    this._stopper.destroy();
  }
}

export default defn(module, InboxAppToolbarTooltipView);
