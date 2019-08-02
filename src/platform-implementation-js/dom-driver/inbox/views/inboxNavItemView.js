/* @flow */

import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import insertElementInOrder from '../../../lib/dom/insert-element-in-order';
import querySelector from '../../../lib/dom/querySelectorOrFail';
import DropdownView from '../../../widgets/buttons/dropdown-view';
import InboxDropdownView from './inbox-dropdown-view';

import NAV_ITEM_TYPES from '../../../constants/nav-item-types';

import updateIcon from '../../../driver-common/update-icon';

import type { Bus } from 'kefir-bus';

type Destroyable = { destroy: () => void };

export default class InboxNavItemView {
  _eventStream: Bus<any> = kefirBus();
  _level: number;
  _stopper: Kefir.Observable<null>;
  _transitionResetter: Bus<null> = kefirBus();
  _navItemDescriptor: ?Object;
  _children: number = 0;
  _name: string = '';
  _type: ?string = null;
  _orderHint: number = Number.MAX_SAFE_INTEGER;
  _disabled: boolean = false;
  _isCollapsed: boolean = false;
  _iconSettings: Object = {};
  _accessory: ?Object = null;
  _accessoryView: ?Destroyable = null;
  _elements: {
    wrapper: HTMLElement,
    expander: HTMLElement,
    navItem: HTMLElement,
    name: HTMLElement,
    subNav: HTMLElement,
    subNavInner: HTMLElement,
    accessory: HTMLElement
  };

  constructor(navItemDescriptor: Kefir.Observable<Object>, level: number) {
    this._level = level || 0;
    this._elements = {
      wrapper: document.createElement('div'),
      expander: document.createElement('div'),
      navItem: document.createElement('div'),
      name: document.createElement('span'),
      subNav: document.createElement('div'),
      subNavInner: document.createElement('div'),
      accessory: document.createElement('div')
    };

    if (this._level > 2) {
      console.warn('Adding NavItems more than 3 levels deep is not supported'); //eslint-disable-line no-console
    }

    this._stopper = this._eventStream
      .ignoreValues()
      .beforeEnd(() => null)
      .toProperty();

    this._setupElements();

    navItemDescriptor.takeUntilBy(this._stopper).onValue(descriptor => {
      this._update(descriptor);
      this._navItemDescriptor = descriptor;
    });
  }

  addNavItem(
    orderGroup: number | string,
    navItemDescriptor: Kefir.Observable<Object>
  ): InboxNavItemView {
    const childNavItemView = new InboxNavItemView(
      navItemDescriptor,
      this._level + 1
    );

    childNavItemView
      .getEventStream()
      .filter(event => event.eventName === 'orderChanged')
      .onValue(() =>
        insertElementInOrder(
          this._elements.subNavInner,
          childNavItemView.getElement()
        )
      );

    insertElementInOrder(
      this._elements.subNavInner,
      childNavItemView.getElement()
    );

    this._children += 1;

    childNavItemView.getStopper().onValue(() => {
      this._children -= 1;
      this._updateChildrenClass();
      this._updateDisabledState(this._navItemDescriptor || {});
      this._updateAccessory(this._accessory, true);
    });

    this._updateChildrenClass();
    this._updateDisabledState(this._navItemDescriptor || {});
    this._updateAccessory(this._accessory, true);

    return childNavItemView;
  }

  setActive(value: boolean) {
    this._elements.navItem.classList.toggle('inboxsdk__navItem_active', value);
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
    const {
      wrapper,
      expander,
      navItem,
      name,
      subNav,
      subNavInner,
      accessory
    } = this._elements;

    wrapper.className = `inboxsdk__navItem_wrapper inboxsdk__navItem_level${
      this._level
    }`;
    wrapper.setAttribute('tabindex', '-1');
    wrapper.setAttribute('data-order-hint', String(this._orderHint));
    navItem.setAttribute('role', 'menuitem');

    expander.classList.add('inboxsdk__navItem_expander');
    navItem.classList.add('inboxsdk__navItem');
    name.classList.add('inboxsdk__navItem_name');
    accessory.classList.add('inboxsdk__navItem_accessory');
    subNav.classList.add('inboxsdk__navItem_subNav');
    subNavInner.classList.add('inboxsdk__navItem_subNavInner');

    // Arrow SVG
    expander.innerHTML =
      '<svg><polygon points="16.59 8.59 12 13.17 7.41 8.59 6 10 12 16 18 10"></polygon></svg>';

    navItem.appendChild(expander);
    navItem.appendChild(name);
    navItem.appendChild(accessory);
    wrapper.appendChild(navItem);

    subNav.appendChild(subNavInner);
    wrapper.appendChild(subNav);

    this._eventStream.plug(
      Kefir.fromEvents(navItem, 'click')
        .filter(() => !this._disabled)
        .map((domEvent: MouseEvent) => {
          domEvent.stopPropagation();
          domEvent.preventDefault();
          return { eventName: 'click', domEvent };
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
    const { subNav, subNavInner } = this._elements;

    this._transitionResetter.emit(null);
    this._elements.wrapper.classList.add('inboxsdk__navItem_collapsed');

    subNav.style.height = `${subNavInner.clientHeight}px`;
    subNav.clientHeight; // Force layout
    subNav.style.height = '0';

    Kefir.merge([Kefir.fromEvents(subNav, 'transitionend'), Kefir.later(750)])
      .takeUntilBy(this._transitionResetter)
      .take(1)
      .onValue(() => {
        subNav.style.display = 'none';
      });

    this._eventStream.emit({
      eventName: 'collapsed'
    });
  }

  _expand() {
    const { subNav, subNavInner } = this._elements;

    this._transitionResetter.emit(null);
    this._elements.wrapper.classList.remove('inboxsdk__navItem_collapsed');

    subNav.style.display = '';
    subNav.style.height = `${subNavInner.clientHeight}px`;

    Kefir.merge([Kefir.fromEvents(subNav, 'transitionend'), Kefir.later(750)])
      .takeUntilBy(this._transitionResetter)
      .take(1)
      .onValue(() => {
        subNav.style.height = '';
      });

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
    this._updateAccessory(descriptor.accessory);
    this._updateOrder(
      descriptor.orderHint || descriptor.orderHint === 0
        ? descriptor.orderHint
        : Number.MAX_SAFE_INTEGER
    );
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

  _updateExpander({ backgroundColor, expanderForegroundColor }: Object) {
    this._elements.expander.style.backgroundColor = backgroundColor || '';

    const arrow = querySelector(this._elements.expander, 'polygon');
    (arrow.style: any).fill = expanderForegroundColor || '';

    this._elements.wrapper.classList.toggle(
      'inboxsdk__navItem_hasColor',
      typeof backgroundColor === 'string'
    );
  }

  _updateIcon(descriptor: Object) {
    this._elements.navItem.classList.toggle(
      'inboxsdk__navItem_hasIcon',
      (!this._disabled || this._level > 0) &&
        Boolean(descriptor.iconUrl || descriptor.iconClass)
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

  _updateAccessory(accessory: ?Object, forceUpdate: boolean = false) {
    if (!forceUpdate && this._accessory === accessory) return;

    if (this._accessoryView) {
      this._accessoryView.destroy();
      this._accessoryView = null;
    }

    if (accessory && !this._disabled) {
      this._accessoryView = this._createAccessory(accessory);
    }

    this._accessory = accessory;
  }

  _updateDisabledState(descriptor: Object) {
    this._disabled =
      !(descriptor.routeID || descriptor.onClick) ||
      (this._level === 0 && this._children > 0);
    this._elements.wrapper.classList.toggle(
      'inboxsdk__navItem_disabled',
      this._disabled
    );
  }

  _updateOrder(orderHint: number) {
    if (this._orderHint === orderHint) return;

    this._elements.wrapper.setAttribute('data-order-hint', String(orderHint));
    this._orderHint = orderHint;
    this._eventStream.emit({ eventName: 'orderChanged' });
  }

  _updateChildrenClass() {
    this._elements.wrapper.classList.toggle(
      'inboxsdk__navItem_hasChildren',
      this._children > 0
    );
  }

  _createAccessory(accessory: Object): Destroyable {
    switch (accessory.type) {
      case 'CREATE':
        return this._createCreateAccessory(accessory);
      case 'ICON_BUTTON':
        return this._createIconButtonAccessory(accessory);
      case 'DROPDOWN_BUTTON':
        return this._createDropdownButtonAccessory(accessory);
      default:
        throw new Error('A type must be specified for NavItem accessories');
    }
  }

  _createCreateAccessory(accessory: Object): Destroyable {
    const { onClick } = accessory;
    return this._createIconButtonAccessory({
      onClick,
      iconUrl:
        '//ssl.gstatic.com/bt/C3341AA7A1A076756462EE2E5CD71C11/2x/ic_add-cluster_24px_g60_r3_2x.png'
    });
  }

  _createDropdownButtonAccessory(accessory: Object): Destroyable {
    const { onClick } = accessory;
    return this._createIconButtonAccessory(
      {
        onClick,
        iconUrl:
          '//www.gstatic.com/images/icons/material/system/2x/settings_black_18dp.png'
      },
      true
    );
  }

  _createIconButtonAccessory(
    accessory: Object,
    hasDropdown: boolean = false
  ): Destroyable {
    if (!accessory.onClick) throw new Error('An onClick handler is required');

    this._elements.wrapper.classList.add('inboxsdk__navItem_hasAccessory');

    updateIcon(
      {},
      this._elements.accessory,
      false,
      accessory.iconClass,
      accessory.iconUrl
    );

    const iconEl = querySelector(
      this._elements.accessory,
      '.inboxsdk__button_icon'
    );
    iconEl.setAttribute('tabindex', '-1');

    const destroyStopper = kefirStopper();
    let dropdown = null;

    Kefir.fromEvents(this._elements.accessory, 'click')
      .takeUntilBy(this._stopper)
      .takeUntilBy(destroyStopper)
      .onValue(event => {
        event.preventDefault();
        event.stopPropagation();
        if (hasDropdown) {
          if (dropdown) {
            dropdown.close();
            return;
          } else {
            iconEl.classList.add('inboxsdk__active');

            dropdown = new DropdownView(
              new InboxDropdownView(),
              this._elements.accessory
            );
            dropdown.setPlacementOptions({
              position: 'right',
              hAlign: 'left',
              vAlign: 'top',
              buffer: 10
            });
            dropdown.on('destroy', () => {
              iconEl.classList.remove('inboxsdk__active');
              dropdown = null;
            });
          }
        }
        accessory.onClick({ dropdown });
      });

    Kefir.merge([this._stopper, destroyStopper])
      .take(1)
      .onValue(() => {
        if (dropdown) {
          dropdown.close();
        }
      });

    const destroy = () => {
      this._elements.wrapper.classList.remove('inboxsdk__navItem_hasAccessory');
      this._elements.accessory.innerHTML = '';
      destroyStopper.destroy();
    };

    return { destroy };
  }
}
