/* @flow */

import {defn} from 'ud';
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

  addSidebarContentPanel(descriptor: Kefir.Observable<Object>) {
    const view = new InboxSidebarContentPanelView(descriptor);
    this._el.insertBefore(view.getElement(), this._el.firstChild);
    this._stopper
      .takeUntilBy(view.getStopper())
      .onValue(() => {
        view.remove();
      });
    return view;
  }
}

export default defn(module, InboxChatSidebarView);
