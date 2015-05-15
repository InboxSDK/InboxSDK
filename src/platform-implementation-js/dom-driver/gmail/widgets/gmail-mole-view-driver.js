import _ from 'lodash';
import $ from 'jquery';
import addAccessors from 'add-accessors';
import kefirStopper from 'kefir-stopper';
import kefirWaitFor from '../../../lib/kefir-wait-for';
import assertInterface from '../../../lib/assert-interface';
import MoleViewDriver from '../../../driver-interfaces/mole-view-driver';
import GmailElementGetter from '../gmail-element-getter';

function setHoverClass(el, hoverClass) {
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

export default class GmailMoleViewDriver {
  constructor(options) {
    this._stopper = kefirStopper();
    this._element = _.assign(document.createElement('div'), {
      className: 'inboxsdk__mole_view',
      innerHTML: `
<div class="inboxsdk__mole_view_inner">
  <div class="inboxsdk__mole_view_titlebar">
    <div class="inboxsdk__mole_title_buttons">
      <img class="Hl" src="images/cleardot.gif" alt="Minimize" aria-label="Minimize" data-tooltip-delay="800" data-tooltip="Minimize"><img class="Hk" id=":rp" src="images/cleardot.gif" alt="Minimize" aria-label="Maximize" data-tooltip-delay="800" data-tooltip="Maximize"><!--<img class="Hq aUG" src="images/cleardot.gif" alt="Pop-out" aria-label="Full-screen (Shift for Pop-out)" data-tooltip-delay="800" data-tooltip="Full-screen (Shift for Pop-out)">--><img class="Ha" src="images/cleardot.gif" alt="Close" aria-label="Close" data-tooltip-delay="800" data-tooltip="Close">
    </div>
    <h2></h2>
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

    const minimizeBtn = this._element.querySelector('.Hl');
    setHoverClass(minimizeBtn, 'Hn');
    minimizeBtn.addEventListener('click', e => {
      this.setMinimized(true);
      e.preventDefault();
      e.stopPropagation();
    });

    const maximizeBtn = this._element.querySelector('.Hk');
    setHoverClass(maximizeBtn, 'Hn');
    maximizeBtn.addEventListener('click', e => {
      this.setMinimized(false);
      e.preventDefault();
      e.stopPropagation();
    });

    //setHoverClass(this._element.querySelector('.Hq'), 'Hr');
    const closeBtn = this._element.querySelector('.Ha');
    setHoverClass(closeBtn, 'Hb');
    closeBtn.addEventListener('click', e => {
      this.destroy();
      e.preventDefault();
      e.stopPropagation();
    });
    this._element.querySelector('.inboxsdk__mole_view_content').appendChild(options.el);
    this.setTitle(options.title || '');
  }

  show() {
    kefirWaitFor(() => GmailElementGetter.getMoleParent())
      .takeUntilBy(this._stopper)
      .onValue(moleParent => {
        moleParent.insertBefore(this._element, _.last(moleParent.children));
        $(moleParent).parents('div.dw').get(0).classList.add('inboxsdk__moles_in_use');
      });
  }

  setMinimized(minimized) {
    if (minimized) {
      this._element.classList.add('inboxsdk__minimized');
    } else {
      this._element.classList.remove('inboxsdk__minimized');
    }
  }

  getMinimized() {
    return this._element.classList.contains('inboxsdk__minimized');
  }

  setTitle(text) {
    this._element.querySelector('.inboxsdk__mole_view_titlebar h2').textContent = text;
  }
}

addAccessors(GmailMoleViewDriver.prototype, [
  {name: '_element', destroy: true, destroyMethod: 'remove'},
  {name: '_stopper', destroy: true, get: true}
]);

assertInterface(GmailMoleViewDriver.prototype, MoleViewDriver);
