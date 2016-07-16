/* @flow */

import _ from 'lodash';
import {defn} from 'ud';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import DropdownView from '../../../widgets/buttons/dropdown-view';
import InboxAppToolbarTooltipView from './inbox-app-toolbar-tooltip-view';
import type {ElementWithLifetime} from '../../../lib/dom/make-element-child-stream';

class InboxAppToolbarButtonView {
  _buttonDescriptor: ?Object = null;
  _buttonDescriptorStream: Kefir.Stream<Object>;
  _buttonEl: ?HTMLElement = null;
  _activeDropdown: ?DropdownView = null;
  _stopper: Kefir.Stream&{destroy():void} = kefirStopper();
  _ready: Kefir.Stream&{destroy():void} = kefirStopper();

  constructor(buttonDescriptor: Kefir.Stream<Object>, appToolbarLocationStream: Kefir.Stream<ElementWithLifetime>, searchBarStream: Kefir.Stream<ElementWithLifetime>) {
    this._buttonDescriptorStream = buttonDescriptor.toProperty().takeUntilBy(this._stopper);

    Kefir.combine([
      searchBarStream.take(1),
      appToolbarLocationStream.take(1)
    ], [], searchBar => searchBar)
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
    button.tabIndex = 0;
    button.setAttribute('role', 'button');
    button.className = 'inboxsdk__appButton inboxsdk__button_icon';

    const buttonImg = document.createElement('img');
    buttonImg.className = 'inboxsdk__button_iconImg';
    button.appendChild(buttonImg);

    this._buttonDescriptorStream.onValue(buttonDescriptor => {
      button.title = buttonDescriptor.title;
      buttonImg.src = buttonDescriptor.iconUrl;
      buttonImg.className = `inboxsdk__button_iconImg ${buttonDescriptor.iconClass||''}`;
      this._buttonDescriptor = buttonDescriptor;
    });

    Kefir.merge([
      Kefir.fromEvents(button, 'click'),
      Kefir.fromEvents(button, 'keypress').filter(e => _.includes([32/*space*/, 13/*enter*/], e.which))
    ])
    .takeUntilBy(this._stopper)
    .onValue(event => {
      event.preventDefault();
      event.stopPropagation();
      if (this._activeDropdown) {
        this.close();
      } else {
        this.open();
      }
    });

    appToolbarButtonContainer.insertBefore(button, appToolbarButtonContainer.firstChild);
    this._buttonEl = button;

    this._ready.destroy();

    this._stopper.onValue(() => {
      button.remove();
    });
  }

  _adjustSearchBarMargin(searchBar: HTMLElement) {
    const buttonWidth = 40;
    const defaultMarginRight = 70;

    let newMarginRight;
    let style = document.getElementById('inboxsdk__dynamic_resize_searchbar');
    if (style) {
      const sheet = (style:any).sheet;
      const currentMarginRight = parseInt(style.getAttribute('data-min-margin-right'));
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

    function setSheetRules(minMarginRight: number) {
      style.setAttribute('data-min-margin-right', String(minMarginRight));
      for (let i=sheet.rules.length-1; i>=0; i--) {
        sheet.deleteRule(i);
      }
      if (minMarginRight <= 0) return;
      const important = minMarginRight > defaultMarginRight ? '!important' : '';

      // When the page gets wider than this number, stop applying our override
      // so that Inbox's margin:auto takes over.
      const applyWhenPageWidthUnder = 1394+3.575*minMarginRight;

      const rule = `@media (max-width: ${applyWhenPageWidthUnder}px) { .${ruleClassName} { margin-right: ${minMarginRight}px${important}; } }`;
      sheet.insertRule(rule, 0);
    }

    setSheetRules(newMarginRight);

    searchBar.classList.add(ruleClassName);
    const {nextElementSibling} = searchBar;
    if (nextElementSibling) {
      nextElementSibling.classList.add(ruleClassName);
    }

    this._stopper.onValue(() => {
      const currentMarginRight = parseInt(style.getAttribute('data-min-margin-right'));
      const newMarginRight = currentMarginRight-buttonWidth;
      setSheetRules(newMarginRight);
    });
  }

  open() {
    if (this._activeDropdown) return;
    const button = this._buttonEl;
    if (!button) throw new Error('should not happen');
    button.classList.add('inboxsdk__active');
    const {arrowColor} = (this._buttonDescriptor||{});
    const dropdown = this._activeDropdown = new DropdownView(
      new InboxAppToolbarTooltipView(button, arrowColor), button
    );
    dropdown.once('destroy', () => {
      this._activeDropdown = null;
      button.classList.remove('inboxsdk__active');
    });
    const appEvent = {dropdown};
    if(this._buttonDescriptor && this._buttonDescriptor.onClick){
      this._buttonDescriptor.onClick.call(null, appEvent);
    }
  }

  close() {
    if (!this._activeDropdown) return;
    this._activeDropdown.close();
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
