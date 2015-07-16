/* @flow */
//jshint ignore:start

import _ from 'lodash';
import $ from 'jquery';
import addAccessors from 'add-accessors';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import kefirWaitFor from '../../../lib/kefir-wait-for';
import type {MoleViewDriver} from '../../../driver-interfaces/mole-view-driver';
import GmailElementGetter from '../gmail-element-getter';

function setHoverClass(el: HTMLElement, hoverClass: string) {
  el.addEventListener('mouseenter', function() {
    el.classList.add(hoverClass);
  });
  el.addEventListener('mouseleave', function() {
    el.classList.remove(hoverClass);
  });
  el.addEventListener('click', function() {
    el.classList.remove(hoverClass);
  });
}

export type Options = {
  el: HTMLElement;
  className?: string;
  title?: string;
  titleEl?: HTMLElement;
  minimizedTitleEl?: HTMLElement;
  //titleButtons?: Object[];
};

export default class GmailMoleViewDriver {
  _eventStream: kefirBus;
  _stopper: kefirStopper;
  _element: HTMLElement;

  constructor(options: Options) {
    this._eventStream = kefirBus();
    this._stopper = kefirStopper();
    this._element = Object.assign(document.createElement('div'), {
      className: 'inboxsdk__mole_view '+(options.className||''),
      innerHTML: `
<div class="inboxsdk__mole_view_inner">
  <div class="inboxsdk__mole_view_titlebar">
    <div class="inboxsdk__mole_title_buttons">
      <img class="Hl" src="images/cleardot.gif" alt="Minimize" aria-label="Minimize" data-tooltip-delay="800" data-tooltip="Minimize"><img class="Hk" id=":rp" src="images/cleardot.gif" alt="Minimize" aria-label="Maximize" data-tooltip-delay="800" data-tooltip="Maximize"><!--<img class="Hq aUG" src="images/cleardot.gif" alt="Pop-out" aria-label="Full-screen (Shift for Pop-out)" data-tooltip-delay="800" data-tooltip="Full-screen (Shift for Pop-out)">--><img class="Ha" src="images/cleardot.gif" alt="Close" aria-label="Close" data-tooltip-delay="800" data-tooltip="Close">
    </div>
    <h2 class="inboxsdk__mole_default"></h2>
    <h2 class="inboxsdk__mole_minimized"></h2>
  </div>
  <div class="inboxsdk__mole_view_content"></div>
</div>
`
    });
    this._element.querySelector('.inboxsdk__mole_view_titlebar').addEventListener('click', e => {
      this.setMinimized(!this.getMinimized());
      e.preventDefault();
      e.stopPropagation();
    });

    var minimizeBtn = this._element.querySelector('.Hl');
    setHoverClass(minimizeBtn, 'Hn');
    minimizeBtn.addEventListener('click', e => {
      this.setMinimized(true);
      e.preventDefault();
      e.stopPropagation();
    });

    var maximizeBtn = this._element.querySelector('.Hk');
    setHoverClass(maximizeBtn, 'Hn');
    maximizeBtn.addEventListener('click', e => {
      this.setMinimized(false);
      e.preventDefault();
      e.stopPropagation();
    });

    //setHoverClass(this._element.querySelector('.Hq'), 'Hr');
    var closeBtn = this._element.querySelector('.Ha');
    setHoverClass(closeBtn, 'Hb');
    closeBtn.addEventListener('click', e => {
      this.destroy();
      e.preventDefault();
      e.stopPropagation();
    });
    this._element.querySelector('.inboxsdk__mole_view_content').appendChild(options.el);
    if (options.titleEl) {
      this._setTitleEl(options.titleEl);
    } else {
      this.setTitle(options.title || '');
    }
    if (options.minimizedTitleEl) {
      this._setMinimizedTitleEl(options.minimizedTitleEl);
    }
  }

  show() {
    var doShow = (moleParent) => {
      moleParent.insertBefore(this._element, _.last(moleParent.children));
      $(moleParent).parents('div.dw').get(0).classList.add('inboxsdk__moles_in_use');
    };

    var moleParent = GmailElementGetter.getMoleParent();
    if (moleParent) {
      doShow(moleParent);
    } else {
      kefirWaitFor(() => GmailElementGetter.getMoleParent())
        .takeUntilBy(this._stopper)
        .onValue(doShow);
    }
  }

  setMinimized(minimized: boolean) {
    if (minimized) {
      this._element.classList.add('inboxsdk__minimized');
      this._eventStream.emit({eventName:'minimize'});
    } else {
      this._element.classList.remove('inboxsdk__minimized');
      this._eventStream.emit({eventName:'restore'});
    }
  }

  getMinimized(): boolean {
    return this._element.classList.contains('inboxsdk__minimized');
  }

  setTitle(text: string) {
    this._element.querySelector('.inboxsdk__mole_view_titlebar h2.inboxsdk__mole_default').textContent = text;
  }

  _setTitleEl(el: HTMLElement) {
    var container = this._element.querySelector('.inboxsdk__mole_view_titlebar h2.inboxsdk__mole_default');
    container.textContent = '';
    container.appendChild(el);
  }

  _setMinimizedTitleEl(el: HTMLElement) {
    this._element.classList.add('inboxsdk__mole_use_minimize_title');
    var container = this._element.querySelector('.inboxsdk__mole_view_titlebar h2.inboxsdk__mole_minimized');
    container.textContent = '';
    container.appendChild(el);
  }

  getEventStream(): Kefir.Stream {
    return this._eventStream;
  }

  destroy() {
    (this._element:any).remove();
    this._eventStream.end();
    this._stopper.destroy();
  }
}

// This function does not get executed. It's only checked by Flow to make sure
// this class successfully implements the type interface.
function __interfaceCheck() {
	var test: MoleViewDriver = new GmailMoleViewDriver(({}:any));
}
