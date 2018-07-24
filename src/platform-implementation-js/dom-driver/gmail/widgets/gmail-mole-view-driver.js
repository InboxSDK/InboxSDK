/* @flow */

import last from 'lodash/last';
import {defn} from 'ud';
import addAccessors from 'add-accessors';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import streamWaitFor from '../../../lib/stream-wait-for';
import querySelector from '../../../lib/dom/querySelectorOrFail';
import findParent from '../../../../common/find-parent';
import type {MoleViewDriver, MoleOptions} from '../../../driver-interfaces/mole-view-driver';
import GmailElementGetter from '../gmail-element-getter';
import type GmailDriver from '../gmail-driver';

class GmailMoleViewDriver {
  _driver: GmailDriver;
  _eventStream = kefirBus();
  _stopper = kefirStopper();
  _element: HTMLElement;

  constructor(driver: GmailDriver, options: MoleOptions) {
    (this: MoleViewDriver); // interface check
    this._driver = driver;
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
    const doShow = (moleParent) => {
      moleParent.insertBefore(this._element, last(moleParent.children));
      const dw = findParent(moleParent, el => el.nodeName === 'DIV' && el.classList.contains('dw'));
      if (dw) {
        dw.classList.add('inboxsdk__moles_in_use');
      }
    };

    const moleParent = GmailElementGetter.getMoleParent();
    if (moleParent) {
      doShow(moleParent);
    } else {
      const moleParentReadyEvent = streamWaitFor(() => GmailElementGetter.getMoleParent())
        .takeUntilBy(this._stopper)
        .onValue(doShow);

      // For some users, the mole parent element seems to be lazily loaded by
      // Gmail only once the user has used a compose view or a thread view.
      // If the gmail mode has settled, we've been loaded for 10 seconds, and
      // we don't have the mole parent yet, then force the mole parent to load
      // by opening a compose view and then closing it.

      Kefir.fromPromise(GmailElementGetter.waitForGmailModeToSettle())
        .flatMap(() => {
          // delay until we've passed TimestampOnReady + 10 seconds
          const targetTime = (this._driver.getTimestampOnReady() || Date.now()) + 10*1000;
          const timeToWait = Math.max(0, targetTime - Date.now());
          return Kefir.later(timeToWait);
        })
        .takeUntilBy(moleParentReadyEvent)
        .takeUntilBy(this._stopper)
        .onValue(() => {
          this._driver.getLogger().eventSdkActive('mole parent force load');
          this._driver.openNewComposeViewDriver().then(gmailComposeView => {
            gmailComposeView.close();
          });
        });
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
        moleParent.insertBefore(this._element, last(moleParent.children));
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
    const container = this._element.querySelector('.inboxsdk__mole_view_titlebar h2.inboxsdk__mole_default');
    if(container){
      container.textContent = '';
      container.appendChild(el);
    }
  }

  _setMinimizedTitleEl(el: HTMLElement) {
    const container = this._element.querySelector('.inboxsdk__mole_view_titlebar h2.inboxsdk__mole_minimized');
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
    this._element.remove();
    this._eventStream.end();
    this._stopper.destroy();
  }
}

export default defn(module, GmailMoleViewDriver);

function getHTMLString(options: MoleOptions){
  return `
    <div class="inboxsdk__mole_view_inner">
      ${getTitleHTMLString(options)}
      <div class="inboxsdk__mole_view_content"></div>
    </div>
  `;
}

function getTitleHTMLString(options: MoleOptions){
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
