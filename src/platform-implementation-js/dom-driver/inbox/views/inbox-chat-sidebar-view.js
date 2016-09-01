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
}

export default defn(module, InboxChatSidebarView);
