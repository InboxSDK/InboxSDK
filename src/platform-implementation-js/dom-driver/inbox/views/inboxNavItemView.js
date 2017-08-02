/* @flow */

import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type {Bus} from 'kefir-bus';
import insertElementInOrder from '../../../lib/dom/insert-element-in-order';
import eventNameFilter from '../../../lib/event-name-filter';
import querySelector from '../../../lib/dom/querySelectorOrFail';

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
  _orderHint: number = Number.MAX_SAFE_INTEGER;
  _disabled: boolean = false;
  _isCollapsed: boolean = false;
  _iconSettings: Object = {};
  _elements: {
    wrapper: HTMLElement;
    expander: HTMLElement;
    navItem: HTMLElement;
    name: HTMLElement;
    subNav: HTMLElement;
  };

  constructor(orderGroup: number|string, level: number) {
    this._eventStream = kefirBus();
    this._level = level || 0;
    this._elements = {
      wrapper: document.createElement('div'),
      expander: document.createElement('div'),
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

    childNavItemView.getEventStream()
      .filter(eventNameFilter('orderChanged'))
      .onValue(() => (
        insertElementInOrder(this._elements.subNav, childNavItemView.getElement())
      ));

    childNavItemView.setNavItemDescriptor(navItemDescriptor);

    insertElementInOrder(this._elements.subNav, childNavItemView.getElement());

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
    this._isCollapsed = !this._isCollapsed;

    this._isCollapsed ? this._collapse() : this._expand();
  }

  setCollapsed(value: boolean) {
    if (this._isCollapsed === value) return;

    this._isCollapsed = value;

    this._isCollapsed ? this._collapse() : this._expand();
  }

  isCollapsed(): boolean {
    return this._isCollapsed;
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
    this._elements.wrapper.remove();
  }

  _setupElements() {
    const {wrapper, expander, navItem, name, subNav} = this._elements;

    wrapper.className = `inboxsdk__navItem_wrapper inboxsdk__navItem_level${this._level}`;
    wrapper.setAttribute('tabindex', '-1');
    wrapper.setAttribute('data-order-hint', String(this._orderHint));
    navItem.setAttribute('role', 'menuitem');

    expander.classList.add('inboxsdk__navItem_expander');
    navItem.classList.add('inboxsdk__navItem');
    name.classList.add('inboxsdk__navItem_name');
    subNav.classList.add('inboxsdk__navItem_subNav');

    // Arrow SVG
    expander.innerHTML = '<svg><polygon points="16.59 8.59 12 13.17 7.41 8.59 6 10 12 16 18 10"></polygon><svg>';

    navItem.appendChild(expander);
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

    Kefir.fromEvents(expander, 'click')
      .takeUntilBy(this._stopper)
      .filter(() => this._children > 0)
      .onValue((domEvent: MouseEvent) => {
        this.toggleCollapse();
        domEvent.stopPropagation();
      });
  }

  _collapse() {
    this._elements.wrapper.classList.add('inboxsdk__navItem_collapsed');

    this._eventStream.emit({
      eventName: 'collapsed'
    });
  }

  _expand() {
    this._elements.wrapper.classList.remove('inboxsdk__navItem_collapsed');

    this._eventStream.emit({
      eventName: 'expanded'
    });
  }

  _update(descriptor: Object) {
    this._updateName(descriptor.name);
    this._updateType(descriptor.type);
    this._updateExpander(descriptor);
    this._updateDisabledState(descriptor);
    this._updateIcon(descriptor);
    this._updateOrder(descriptor.orderHint || Number.MAX_SAFE_INTEGER);
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

  _updateExpander({expanderBackgroundColor, expanderForegroundColor}: Object) {
    this._elements.expander.style.backgroundColor = expanderBackgroundColor || '';

    const arrow = querySelector(this._elements.expander, 'polygon');
    (arrow.style: any).fill = expanderForegroundColor || '';
  }

  _updateIcon(descriptor: Object) {
    this._elements.navItem.classList.toggle(
      'inboxsdk__navItem_hasIcon',
      (!this._disabled || this._level > 0) && Boolean(descriptor.iconUrl || descriptor.iconClass)
    );

    updateIcon(
      this._iconSettings,
      this._elements.navItem,
      false,
      descriptor.iconClass,
      descriptor.iconUrl,
      this._elements.name
    );
  }

  _updateDisabledState(descriptor: Object) {
    this._disabled = (
      !(descriptor.routeID || descriptor.onClick) ||
      (this._level === 0 && this._children > 0)
    );
    this._elements.wrapper.classList.toggle(
      'inboxsdk__navItem_disabled',
      this._disabled
    );
  }

  _updateOrder(orderHint: number) {
    if (this._orderHint === orderHint) return;

    this._elements.wrapper.setAttribute('data-order-hint', String(orderHint));
    this._orderHint = orderHint;
    this._eventStream.emit({eventName: 'orderChanged'});
  }

  _updateChildrenClass() {
    this._elements.wrapper.classList.toggle(
      'inboxsdk__navItem_hasChildren',
      this._children > 0
    );
  }
}
