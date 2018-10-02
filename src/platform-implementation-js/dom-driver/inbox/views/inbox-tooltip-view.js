/* @flow */

import {defn} from 'ud';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import type {TooltipDescriptor} from '../../../views/compose-button-view';
import containByScreen from 'contain-by-screen';

class InboxTooltipView {
  _target: HTMLElement;
  _el: HTMLElement;
  _contentEl: HTMLElement;
  _arrowEl: HTMLElement;
  _stopper = kefirStopper();

  constructor(target: HTMLElement, options: TooltipDescriptor) {
    this._target = target;
    this._arrowEl = document.createElement('div');
    this._arrowEl.className = 'inboxsdk__tooltip_arrow';
    this._contentEl = document.createElement('div');
    this._contentEl.className = 'inboxsdk__tooltip_content';
    this._el = document.createElement('div');
    this._el.style.position = 'fixed';
    this._el.className = 'inboxsdk__tooltip';
    this._el.appendChild(this._contentEl);
    if (options.el) {
      this._contentEl.appendChild(options.el);
      this._el.classList.add('inboxsdk__tooltip_chromeless');
    } else {
      {
        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.title = 'Close';
        closeButton.className = 'inboxsdk__close_button';
        closeButton.addEventListener('click', (e: MouseEvent) => {
          this.destroy();
        });
        this._el.appendChild(closeButton);
      }
      if (options.imageUrl) {
        const src = options.imageUrl;
        const img = document.createElement('img');
        img.className = 'inboxsdk__tooltip_img';
        img.src = src;
        this._contentEl.appendChild(img);
      }
      if (options.title) {
        const title = options.title;
        const titleEl = document.createElement('h1');
        titleEl.textContent = title;
        this._contentEl.appendChild(titleEl);
      }
      if (options.subtitle) {
        const subtitle = options.subtitle;
        const sEl = document.createElement('div');
        sEl.className = 'inboxsdk__subtitle';
        sEl.textContent = subtitle;
        this._contentEl.appendChild(sEl);
      }
      if (options.button) {
        const button = options.button;
        const buttonEl = document.createElement('input');
        buttonEl.type = 'button';
        buttonEl.value = button.title;
        buttonEl.addEventListener('click', (event: MouseEvent) => {
          event.preventDefault();
          event.stopPropagation();
          if (button.onClick) button.onClick.call(null);
        });
        this._contentEl.appendChild(buttonEl);
      }
    }

    ((document.body:any):HTMLElement).appendChild(this._el);
    ((document.body:any):HTMLElement).appendChild(this._arrowEl);
    this._updatePosition(true);
    this._el.addEventListener('load', (event:any) => {
      this._updatePosition(true);
    }, true);

    Kefir.interval(200)
      .takeUntilBy(this._stopper)
      .map(() => target.getBoundingClientRect())
      .skipDuplicates((a:ClientRect,b:ClientRect) =>
        a.top === b.top && a.left === b.left && a.right === b.right &&
        a.bottom === b.bottom
      )
      .onValue(() => {
        this._updatePosition();
      });
  }

  destroy() {
    this._el.remove();
    this._arrowEl.remove();
    this._stopper.destroy();
  }

  getStopper(): Kefir.Observable<null> {
    return this._stopper;
  }

  _updatePosition(noTransition:boolean=false) {
    if (noTransition) {
      this._el.classList.add('inboxsdk__notransition');
      this._arrowEl.classList.add('inboxsdk__notransition');
    }
    const {position} = containByScreen(this._el, this._target, {
      position: 'top',
      hAlign: 'center',
      vAlign: 'center',
      buffer: 10
    });
    containByScreen(this._arrowEl, this._target, {
      position: position,
      forcePosition: true,
      hAlign: 'center',
      forceHAlign: true,
      vAlign: 'center',
      forceVAlign: true,
      buffer: 11 // needs to overlap 1px of border
    });
    ['top','bottom','left','right'].forEach(x => {
      this._arrowEl.classList.remove('inboxsdk__'+x);
    });
    this._arrowEl.classList.add('inboxsdk__'+position);
    if (noTransition) {
      this._el.offsetHeight; // Trigger a reflow, flushing the CSS changes
      this._arrowEl.offsetHeight;
      // see http://stackoverflow.com/a/16575811/1289657
      this._el.classList.remove('inboxsdk__notransition');
      this._arrowEl.classList.remove('inboxsdk__notransition');
    }
  }
}
export default defn(module, InboxTooltipView);
