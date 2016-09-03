/* @flow */

import {defn} from 'ud';
import _ from 'lodash';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import type {Parsed} from '../detection/chatSidebar/parser';

import InboxSidebarContentPanelView from './inbox-sidebar-content-panel-view';

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

  getMode(): 'HIDDEN'|'DROPDOWN'|'SIDEBAR' {
    if (this._el.style.display === 'none') {
      return 'HIDDEN';
    }
    const parent: HTMLElement = (this._el.parentElement: any);
    if (parseInt(window.getComputedStyle(parent).bottom) === 0) {
      return 'SIDEBAR'
    }
    return 'DROPDOWN';
  }
}

export default defn(module, InboxChatSidebarView);
