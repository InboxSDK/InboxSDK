/* @flow */

import _ from 'lodash';
import {defn} from 'ud';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import type {ElementWithLifetime} from '../../../lib/dom/make-element-child-stream';

class InboxAppToolbarButtonView {
  _stopper: Kefir.Stream&{destroy():void} = kefirStopper();
  _ready: Kefir.Stream&{destroy():void} = kefirStopper();

  constructor(appToolbarLocationStream: Kefir.Stream<ElementWithLifetime>, searchBarStream: Kefir.Stream<ElementWithLifetime>) {
    searchBarStream
      .take(1)
      .takeUntilBy(this._stopper)
      .onValue(({el}) => this._adjustSearchBarMargin(el));

    appToolbarLocationStream
      .take(1)
      .takeUntilBy(this._stopper)
      .onValue(({el}) => this._setupButton(el));
  }

  _setupButton(appToolbarLocation: HTMLElement) {
    let appToolbarButtonContainer = _.find(appToolbarLocation.children, el => el.classList.contains('inboxsdk__appButton_container'));
    if (!appToolbarButtonContainer) {
      appToolbarButtonContainer = document.createElement('div');
      appToolbarButtonContainer.className = 'inboxsdk__appButton_container';
      appToolbarLocation.insertBefore(appToolbarButtonContainer, appToolbarLocation.firstChild);
    }

    const button = document.createElement('div');
    button.textContent = ':)';
    appToolbarButtonContainer.insertBefore(button, appToolbarButtonContainer.firstChild);

    this._ready.destroy();
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
    return this._ready
      .map(() => this)
      .merge(this._stopper.flatMap(() =>
        Kefir.constantError(new Error('InboxAppToolbarButtonView was destroyed early'))
      ))
      .take(1).takeErrors(1).toPromise(Promise);
  }

  getStopper() {
    return this._stopper;
  }

  destroy() {
    this._stopper.destroy();
  }
}

export default defn(module, InboxAppToolbarButtonView);
