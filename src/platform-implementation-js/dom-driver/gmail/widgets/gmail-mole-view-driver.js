/* @flow */

import _ from 'lodash';
import {defn} from 'ud';
import addAccessors from 'add-accessors';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import streamWaitFor from '../../../lib/stream-wait-for';
import querySelector from '../../../lib/dom/querySelectorOrFail';
import findParent from '../../../../common/find-parent';
import type {MoleViewDriver} from '../../../driver-interfaces/mole-view-driver';
import GmailElementGetter from '../gmail-element-getter';

export type MoleButtonDescriptor = {
  title: string;
  iconUrl: string;
  iconClass?: string;
  onClick: Function;
};

export type Options = {
  el: HTMLElement;
  className?: string;
  title?: string;
  titleEl?: HTMLElement;
  minimizedTitleEl?: HTMLElement;
  titleButtons?: MoleButtonDescriptor[];
  chrome?: boolean;
};

const GmailMoleViewDriver = defn(module, class GmailMoleViewDriver {
  _eventStream = kefirBus();
  _stopper = kefirStopper();
  _element: HTMLElement;

  constructor(options: Options) {
    this._element = Object.assign(document.createElement('div'), {
      className: 'inboxsdk__mole_view '+(options.className||''),
      innerHTML: getHTMLString(options)
    });

    if(options.chrome === false){
      this._element.classList.add('inboxsdk__mole_view_chromeless');
    }
    else{
      querySelector(this._element, '.inboxsdk__mole_view_titlebar').addEventListener('click', (e: MouseEvent) => {
        this.setMinimized(!this.getMinimized());
        e.preventDefault();
        e.stopPropagation();
      });

      const minimizeBtn = querySelector(this._element, '.Hl');
      minimizeBtn.addEventListener('click', (e: MouseEvent) => {
        this.setMinimized(true);
        e.preventDefault();
        e.stopPropagation();
      });

      const maximizeBtn = querySelector(this._element, '.Hk');
      maximizeBtn.addEventListener('click', (e: MouseEvent) => {
        this.setMinimized(false);
        e.preventDefault();
        e.stopPropagation();
      });

      const closeBtn = querySelector(this._element, '.Ha');
      closeBtn.addEventListener('click', (e: MouseEvent) => {
        this.destroy();
        e.preventDefault();
        e.stopPropagation();
      });

      if (options.titleEl) {
        this._setTitleEl(options.titleEl);
      } else {
        this.setTitle(options.title || '');
      }
      if (options.minimizedTitleEl) {
        this._setMinimizedTitleEl(options.minimizedTitleEl);
      }

      const titleButtons = options.titleButtons;
      if (titleButtons) {
        const titleButtonContainer = querySelector(this._element, '.inboxsdk__mole_title_buttons');
        const lastChild: HTMLElement = (titleButtonContainer.lastElementChild:any);
        titleButtons.forEach(titleButton => {
          const img: HTMLImageElement = (document.createElement('img'):any);
          if (titleButton.iconClass) {
            img.className = titleButton.iconClass;
          }
          img.setAttribute('data-tooltip', titleButton.title);
          img.addEventListener('click', (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            titleButton.onClick.call(null);
          });
          img.src = titleButton.iconUrl;
          titleButtonContainer.insertBefore(img, lastChild);
        });
      }
    }

    querySelector(this._element, '.inboxsdk__mole_view_content').appendChild(options.el);
  }

  show() {
    var doShow = (moleParent) => {
      moleParent.insertBefore(this._element, _.last(moleParent.children));
      const dw = findParent(moleParent, el => el.nodeName === 'DIV' && el.classList.contains('dw'));
      if (dw) {
        dw.classList.add('inboxsdk__moles_in_use');
      }
    };

    var moleParent = GmailElementGetter.getMoleParent();
    if (moleParent) {
      doShow(moleParent);
    } else {
      streamWaitFor(() => GmailElementGetter.getMoleParent())
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

      // If the mole is off the left edge of the screen, then move it to the
      // right.
      const moleParent = this._element.parentElement;
      if (moleParent && this._element.getBoundingClientRect().left < 0) {
        moleParent.insertBefore(this._element, _.last(moleParent.children));
      }

      this._eventStream.emit({eventName:'restore'});
    }
  }

  getMinimized(): boolean {
    return this._element.classList.contains('inboxsdk__minimized');
  }

  setTitle(text: string) {
    const titleElement = this._element.querySelector('.inboxsdk__mole_view_titlebar h2.inboxsdk__mole_default');
    if(titleElement){
      titleElement.textContent = text;
    }
  }

  _setTitleEl(el: HTMLElement) {
    var container = this._element.querySelector('.inboxsdk__mole_view_titlebar h2.inboxsdk__mole_default');
    if(container){
      container.textContent = '';
      container.appendChild(el);
    }
  }

  _setMinimizedTitleEl(el: HTMLElement) {
    var container = this._element.querySelector('.inboxsdk__mole_view_titlebar h2.inboxsdk__mole_minimized');
    if(container){
      this._element.classList.add('inboxsdk__mole_use_minimize_title');
      container.textContent = '';
      container.appendChild(el);
    }
  }

  getEventStream(): Kefir.Observable<Object> {
    return this._eventStream;
  }

  destroy() {
    (this._element:any).remove();
    this._eventStream.end();
    this._stopper.destroy();
  }
});
export default GmailMoleViewDriver;

function getHTMLString(options: Options){
  return `
    <div class="inboxsdk__mole_view_inner">
      ${getTitleHTMLString(options)}
      <div class="inboxsdk__mole_view_content"></div>
    </div>
  `;
}

function getTitleHTMLString(options: Options){
  if(options.chrome === false){
    return '';
  }
  else{
    return `<div class="inboxsdk__mole_view_titlebar">
    <div class="inboxsdk__mole_title_buttons">
      <img class="Hl" src="images/cleardot.gif" alt="Minimize" aria-label="Minimize" data-tooltip-delay="800" data-tooltip="Minimize"><img class="Hk" id=":rp" src="images/cleardot.gif" alt="Minimize" aria-label="Maximize" data-tooltip-delay="800" data-tooltip="Maximize"><!--<img class="Hq aUG" src="images/cleardot.gif" alt="Pop-out" aria-label="Full-screen (Shift for Pop-out)" data-tooltip-delay="800" data-tooltip="Full-screen (Shift for Pop-out)">--><img class="Ha" src="images/cleardot.gif" alt="Close" aria-label="Close" data-tooltip-delay="800" data-tooltip="Close">
    </div>
    <h2 class="inboxsdk__mole_default"></h2>
    <h2 class="inboxsdk__mole_minimized"></h2>
    </div>`;
  }
}

// This function does not get executed. It's only checked by Flow to make sure
// this class successfully implements the type interface.
function __interfaceCheck() {
	var test: MoleViewDriver = new GmailMoleViewDriver(({}:any));
}
