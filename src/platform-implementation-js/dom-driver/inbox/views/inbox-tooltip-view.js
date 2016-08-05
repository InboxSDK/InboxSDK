/* @flow */
//jshint ignore:start

var _ = require('lodash');
var ud = require('ud');
var Kefir = require('kefir');
var kefirStopper = require('kefir-stopper');
import type {TooltipDescriptor} from '../../../views/compose-button-view';
import containByScreen from 'contain-by-screen';

var InboxTooltipView = ud.defn(module, class InboxTooltipView {
  _target: HTMLElement;
  _el: HTMLElement;
  _contentEl: HTMLElement;
  _arrowEl: HTMLElement;
  _stopper: Kefir.Stream<null>&{destroy:()=>void};

  constructor(target: HTMLElement, options: TooltipDescriptor) {
    this._target = target;
    this._stopper = kefirStopper();
    this._arrowEl = document.createElement('div');
    this._arrowEl.className = 'inboxsdk__tooltip_arrow';
    this._contentEl = document.createElement('div');
    this._contentEl.className = 'inboxsdk__tooltip_content';
    this._el = document.createElement('div');
    this._el.style.position = 'fixed';
    this._el.className = 'inboxsdk__tooltip';
    this._el.appendChild(this._contentEl);
    if (options.imageUrl) {
      var src = options.imageUrl;
      var img = document.createElement('img');
      img.className = 'inboxsdk__tooltip_img';
      img.src = src;
      this._contentEl.appendChild(img);
    }
    if (options.title) {
      var title = options.title;
      var titleEl = document.createElement('h1');
      titleEl.textContent = title;
      this._contentEl.appendChild(titleEl);
    }
    if (options.subtitle) {
      var subtitle = options.subtitle;
      var sEl = document.createElement('div');
      sEl.textContent = subtitle;
      this._contentEl.appendChild(sEl);
    }
    if (options.button) {
      var button = options.button;
      var buttonEl = document.createElement('input');
      buttonEl.type = 'button';
      buttonEl.value = button.title;
      buttonEl.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        button.onClick.call(null);
      });
      this._contentEl.appendChild(buttonEl);
    }
    if (options.el) {
      this._contentEl.appendChild(options.el);
    }

    document.body.appendChild(this._el);
    document.body.appendChild(this._arrowEl);
    this._updatePosition(true);
    this._el.addEventListener('load', event => {
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
    (this._el:any).remove();
    (this._arrowEl:any).remove();
    this._stopper.destroy();
  }

  getStopper(): Kefir.Stream<null> {
    return this._stopper;
  }

  _updatePosition(noTransition:boolean=false) {
    if (noTransition) {
      this._el.classList.add('inboxsdk__notransition');
      this._arrowEl.classList.add('inboxsdk__notransition');
    }
    var {position} = containByScreen(this._el, this._target, {
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
});
export default InboxTooltipView;
