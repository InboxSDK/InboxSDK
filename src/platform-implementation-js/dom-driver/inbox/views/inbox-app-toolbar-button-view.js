/* @flow */

import find from 'lodash/find';
import includes from 'lodash/includes';
import {defn} from 'ud';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import type LiveSet from 'live-set';
import type {TagTreeNode} from 'tag-tree';
import DropdownView from '../../../widgets/buttons/dropdown-view';
import InboxAppToolbarTooltipView from './inbox-app-toolbar-tooltip-view';
import type {ElementWithLifetime} from '../../../lib/dom/make-element-child-stream';
import toItemWithLifetimeStream from '../../../lib/toItemWithLifetimeStream';
import setCss from '../../../lib/dom/set-css';

class InboxAppToolbarButtonView {
  _buttonDescriptor: ?Object = null;
  _buttonDescriptorStream: Kefir.Observable<Object>;
  _buttonEl: ?HTMLElement = null;
  _activeDropdown: ?DropdownView = null;
  _stopper: Kefir.Observable<null>&{destroy():void} = kefirStopper();
  _ready: Kefir.Observable<null>&{destroy():void} = kefirStopper();

  constructor(buttonDescriptor: Kefir.Observable<Object>, appToolbarLocationLiveSet: LiveSet<TagTreeNode<HTMLElement>>, searchBarLiveSet: LiveSet<TagTreeNode<HTMLElement>>) {
    this._buttonDescriptorStream = buttonDescriptor.toProperty().takeUntilBy(this._stopper);

    Kefir.combine([
      toItemWithLifetimeStream(searchBarLiveSet).take(1),
      toItemWithLifetimeStream(appToolbarLocationLiveSet).take(1)
    ], [], searchBar => searchBar)
      .map(({el: node}) => node.getValue())
      .takeUntilBy(this._stopper)
      .onValue(el => this._adjustSearchBarMargin(el));

    toItemWithLifetimeStream(appToolbarLocationLiveSet)
      .take(1)
      .map(({el: node}) => node.getValue())
      .takeUntilBy(this._stopper)
      .onValue(el => this._setupButton(el));
  }

  _setupButton(appToolbarLocation: HTMLElement) {
    let appToolbarButtonContainer = find(appToolbarLocation.children, el => el.classList.contains('inboxsdk__appButton_container'));
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
      Kefir.fromEvents(button, 'keypress').filter(e => includes([32/*space*/, 13/*enter*/], e.which))
    ])
    .takeUntilBy(this._stopper)
    .onValue(event => {
      event.preventDefault();
      event.stopPropagation();
      if (this._activeDropdown) {
        this.close();
      } else {
        if (!this._buttonDescriptor || this._buttonDescriptor.hasDropdown !== false) {
          this.open();
        } else {
          if (this._buttonDescriptor && this._buttonDescriptor.onClick) {
            this._buttonDescriptor.onClick();
          }
        }
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

    const ATTR_NAME = 'data-inboxsdk-searchbar-min-margin-right';

    const newMarginRight = buttonWidth +
      parseInt(((document.documentElement:any):HTMLElement).getAttribute(ATTR_NAME) || '0');

    const ruleClassName = 'inboxsdk__dynamic_resize_searchbar';

    function setSheetRules(minMarginRight: number) {
      ((document.documentElement:any):HTMLElement).setAttribute(ATTR_NAME, String(minMarginRight));
      if (minMarginRight <= 0) {
        setCss('dynamic_resize_searchbar', '');
        return;
      }
      const important = minMarginRight > defaultMarginRight ? '!important' : '';

      // When the page gets wider than this number, stop applying our override
      // so that Inbox's margin:auto takes over.
      const applyWhenPageWidthUnder = 1394+3.575*minMarginRight;

      // @media-scoped rule is for adjusting gmail stuff. Last rule is for
      // adjusting icons from non-SDK extensions including Mixmax.
      const rule = `
@media (max-width: ${applyWhenPageWidthUnder}px) {
  .${ruleClassName} {
    margin-right: ${minMarginRight}px${important};
  }
}
.inboxsdk__appButton_container + * + * ~ *:not(.inboxsdk_escape_mod) {
  margin-right: ${minMarginRight}px${important};
}
`;
      setCss('dynamic_resize_searchbar', rule);
    }

    setSheetRules(newMarginRight);

    searchBar.classList.add(ruleClassName);
    const {nextElementSibling} = searchBar;
    if (nextElementSibling) {
      nextElementSibling.classList.add(ruleClassName);
    }

    this._stopper.onValue(() => {
      const newMarginRight = parseInt(((document.documentElement:any):HTMLElement).getAttribute(ATTR_NAME) || '0') - buttonWidth;
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
