/* @flow */

import {defn} from 'ud';
import _ from 'lodash';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import type {Parsed} from '../detection/chatSidebar/parser';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';

import InboxSidebarContentPanelView from './inbox-sidebar-content-panel-view';

export type Mode = 'HIDDEN'|'DROPDOWN'|'SIDEBAR';

class InboxChatSidebarView {
  _el: HTMLElement;
  _p: Parsed;
  _stopper = kefirStopper();

  constructor(el: HTMLElement, p: Parsed) {
    this._el = el;
    this._p = p;
  }

  getStopper(): Kefir.Observable<null> {
    return this._stopper;
  }

  destroy() {
    this._stopper.destroy();
  }

  getMode(): Mode {
    const parent: HTMLElement = (this._el.parentElement: any);
    if (parseInt(window.getComputedStyle(parent).bottom) === 0) {
      return 'SIDEBAR'
    }
    if (this._el.style.display === 'none') {
      return 'HIDDEN';
    }
    return 'DROPDOWN';
  }

  getModeStream: () => Kefir.Observable<Mode> = _.once(() => {
    const parent: HTMLElement = (this._el.parentElement: any);
    return makeMutationObserverChunkedStream(
      parent, {attributes: true, attributeFilter: ['class']}
    )
      .toProperty(() => null)
      .map(() => this.getMode())
      .skipDuplicates()
      .takeUntilBy(this._stopper);
  });
}

export default defn(module, InboxChatSidebarView);
