/* @flow */

import {defn} from 'ud';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import type {ElementWithLifetime} from '../../../lib/dom/make-element-child-stream';

class InboxAppToolbarButtonView {
  _stopper: Kefir.Stream&{destroy():void} = kefirStopper();

  constructor(appToolbarLocationStream: Kefir.Stream<ElementWithLifetime>, searchBarStream: Kefir.Stream<ElementWithLifetime>) {
    searchBarStream
      .take(1)
      .takeUntilBy(this._stopper)
      .onValue(({el}) => this._adjustSearchBarMargin(el));
  }

  _adjustSearchBarMargin(searchBar: HTMLElement) {
    const buttonWidth = 40;
    const defaultMarginRight = 70;

    let newMarginRight;
    let style = document.getElementById('inboxsdk__dynamic_resize_searchbar');
    if (style) {
      const sheet = (style:any).sheet;
      const currentMarginRight = parseInt(sheet.cssRules[0].style.marginRight);
      newMarginRight = currentMarginRight+buttonWidth;
      sheet.deleteRule(0);
    } else {
      style = document.createElement('style');
      style.id = 'inboxsdk__dynamic_resize_searchbar';
      document.head.appendChild(style);
      newMarginRight = buttonWidth;
    }
    const sheet = (style:any).sheet;
    const ruleClassName = 'inboxsdk__dynamic_resize_searchbar';
    const important = newMarginRight > defaultMarginRight ? '!important' : '';
    const rule = `.${ruleClassName} { margin-right: ${newMarginRight}px${important}; }`;
    sheet.insertRule(rule, 0);
    searchBar.classList.add(ruleClassName);

    this._stopper.onValue(() => {
      const currentMarginRight = parseInt(sheet.cssRules[0].style.marginRight);
      const newMarginRight = currentMarginRight-buttonWidth;
      sheet.deleteRule(0);
      const important = newMarginRight > defaultMarginRight ? '!important' : '';
      const rule = `.${ruleClassName} { margin-right: ${newMarginRight}px${important}; }`;
      sheet.insertRule(rule, 0);
    });
  }

  open() {
    console.log('TODO open');
  }

  close() {
    console.log('TODO close');
  }

  waitForReady(): Promise<this> {
    return Promise.resolve(this);
  }

  getStopper() {
    return this._stopper;
  }

  destroy() {
    this._stopper.destroy();
  }
}

export default defn(module, InboxAppToolbarButtonView);
