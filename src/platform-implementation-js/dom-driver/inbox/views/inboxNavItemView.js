/* @flow */

import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type {Bus} from 'kefir-bus';

import NAV_ITEM_TYPES from '../../../constants/nav-item-types';

import updateIcon from '../../../driver-common/update-icon';

export default class InboxNavItemView {

  _eventStream: Bus<any>;
  _level: number;
  _stopper: Kefir.Observable<null>;
  _navItemDescriptor: ?Object;
  _children: number = 0;
  _name: string = '';
  _type: ?string = null;
  _disabled: boolean = false;
  _iconSettings: Object = {};
  _elements: {
    wrapper: HTMLElement;
    navItem: HTMLElement;
    name: HTMLElement;
    subNav: HTMLElement;
  };

  constructor(orderGroup: number|string, level: number) {
		this._eventStream = kefirBus();
		this._level = level || 0;
    this._elements = {
      wrapper: document.createElement('div'),
      navItem: document.createElement('div'),
      name: document.createElement('span'),
      subNav: document.createElement('div')
    };

    this._stopper = this._eventStream.ignoreValues().beforeEnd(()=>null).toProperty();

    this._setupElements();
  }

  setNavItemDescriptor(navItemDescriptorPropertyStream: Kefir.Observable<Object>) {
    navItemDescriptorPropertyStream.takeUntilBy(this._stopper).onValue((descriptor) => {
      this._update(descriptor);
      this._navItemDescriptor = descriptor;
    });
  }

  addNavItem(orderGroup: number | string, navItemDescriptor: Object): InboxNavItemView {
    const childNavItemView = new InboxNavItemView(orderGroup, this._level + 1);

    childNavItemView.setNavItemDescriptor(navItemDescriptor);

    this._elements.subNav.appendChild(childNavItemView.getElement());

    this._children += 1;

    childNavItemView.getStopper().onValue(() => {
      this._children -= 1;
      this._updateChildrenClass();
      this._updateDisabledState(this._navItemDescriptor || {});
    });

    this._updateChildrenClass();
    this._updateDisabledState(this._navItemDescriptor || {});

    return childNavItemView;
  }

  setActive(value: boolean) {
    this._elements.navItem.classList.toggle('inboxsdk__navItem_active', value);
  }

  setHighlight(value: boolean) {
    // dummy until i go in and refactor the common code to not include highlight handling
  }

  toggleCollapse() {
    // not yet implemented
  }

  getElement(): HTMLElement {
    return this._elements.wrapper;
  }

  getEventStream(): Kefir.Observable<Object> {
		return this._eventStream;
	}

  getStopper(): Kefir.Observable<null> {
    return this._stopper;
  }

  destroy() {
    this._eventStream.end();
  }

  _setupElements() {
    const {wrapper, navItem, name, subNav} = this._elements;

    wrapper.className = `inboxsdk__navItem_wrapper inboxsdk__navItem_level${this._level}`;
    wrapper.setAttribute('tabindex', '-1');
    navItem.setAttribute('role', 'menuitem');

    navItem.classList.add('inboxsdk__navItem');
    name.classList.add('inboxsdk__navItem_name');
    subNav.classList.add('inboxsdk__navItem_subNav');

    navItem.appendChild(name);
    wrapper.appendChild(navItem);
    wrapper.appendChild(subNav);

    this._eventStream.plug(
      Kefir.fromEvents(navItem, 'click')
        .filter(() => !this._disabled)
        .map((domEvent: MouseEvent) => {
          domEvent.stopPropagation();
          domEvent.preventDefault();
          return {eventName: 'click', domEvent};
        })
    );
  }

  _update(descriptor: Object) {
    this._updateName(descriptor.name);
    this._updateType(descriptor.type);
    this._updateIcon(descriptor);
    this._updateDisabledState(descriptor);
  }

  _updateName(name: string) {
    if (this._name === name) return;

    this._elements.name.textContent = name;
    this._elements.name.setAttribute('title', name);

    this._name = name;
  }

  _updateType(type: string = NAV_ITEM_TYPES.NAVIGATION) {
    if (this._type === type) return;

    this._elements.navItem.classList.toggle(
      'inboxsdk__navItem_link',
      type === NAV_ITEM_TYPES.LINK
    );

    this._type = type;
  }

  _updateIcon(descriptor: Object) {
    this._elements.navItem.classList.toggle(
      'inboxsdk__navItem_hasIcon',
      Boolean(descriptor.iconUrl || descriptor.iconClass)
    );

    updateIcon(
      this._iconSettings,
      this._elements.navItem,
      false,
      descriptor.iconClass,
      descriptor.iconUrl
    );
  }

  _updateDisabledState(descriptor: Object) {
    this._disabled = (
      !(descriptor.routeID || descriptor.onClick) ||
      (this._level === 0 && this._children > 0)
    );
  }

  _updateChildrenClass() {
    this._elements.wrapper.classList.toggle(
      'inboxsdk__navItem_hasChildren',
      this._children > 0
    );
  }
}
