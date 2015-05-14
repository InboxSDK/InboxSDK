import _ from 'lodash';
import $ from 'jquery';
import addAccessors from 'add-accessors';
import kefirStopper from 'kefir-stopper';
import kefirWaitFor from '../../../lib/kefir-wait-for';
import assertInterface from '../../../lib/assert-interface';
import MoleViewDriver from '../../../driver-interfaces/mole-view-driver';
import GmailElementGetter from '../gmail-element-getter';

export default class GmailMoleViewDriver {
  constructor(options) {
    this._stopper = kefirStopper();
    this._element = _.assign(document.createElement('div'), {
      className: 'inboxsdk__mole_view',
      innerHTML: `
<div class="inboxsdk__mole_view_inner">
  <div class="inboxsdk__mole_view_titlebar"><h2></h2></div>
  <div class="inboxsdk__mole_view_content"></div>
</div>
`
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

  setTitle(text) {
    this._element.querySelector('.inboxsdk__mole_view_titlebar h2').textContent = text;
  }
}

addAccessors(GmailMoleViewDriver.prototype, [
  {name: '_element', destroy: true, destroyMethod: 'remove'},
  {name: '_stopper', destroy: true, get: true}
]);

assertInterface(GmailMoleViewDriver.prototype, MoleViewDriver);
