import autoHtml from 'auto-html';
import * as Kefir from 'kefir';
import kefirBus, { Bus } from 'kefir-bus';

import GmailElementGetter from '../gmail-element-getter';

import getInsertBeforeElement from '../../../lib/dom/get-insert-before-element';
import querySelector from '../../../lib/dom/querySelectorOrFail';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';

import ButtonView from '../widgets/buttons/button-view';
import MoreDropdownButtonView from '../widgets/buttons/more-dropdown-button-view';
import MoreParentDropdownButtonView from '../widgets/buttons/more-parent-accessory-button-view';
import CreateAccessoryButtonView from '../widgets/buttons/create-accessory-button-view';
import CreateParentAccessoryButtonView from '../widgets/buttons/create-parent-accessory-button-view';
import GmailDropdownView from '../widgets/gmail-dropdown-view';

import DropdownButtonViewController from '../../../widgets/buttons/dropdown-button-view-controller';
import BasicButtonViewController from '../../../widgets/buttons/basic-button-view-controller';

import updateIcon, { IconSettings } from '../../../driver-common/update-icon';
import renderCustomIcon from '../../../driver-common/render-custom-icon';

import NAV_ITEM_TYPES from '../../../constants/nav-item-types';

import GmailDriver from '../gmail-driver';
import DropdownView from '../../../widgets/buttons/dropdown-view';
import {
  NAV_ITEM_SECTION_CLASS_NAME,
  getSectionNavItemsContainerElement,
} from '../gmail-driver/nav-item-section';

let NUMBER_OF_GMAIL_NAV_ITEM_VIEWS_CREATED = 0;

const GMAIL_V2_LEFT_INDENTATION_PADDING = 12;

type CreateAccessoryDescriptor = {
  type: 'CREATE';
  onClick: () => void;
};

type IconButtonAccessoryDescriptor = {
  type: 'ICON_BUTTON';
  onClick: () => void;
  iconUrl: string;
  iconClass?: string;
};

type DropdownButtonAccessoryDescriptor = {
  type: 'DROPDOWN_BUTTON';
  onClick: (e: { dropdown: DropdownView }) => void;
};

export type NavItemTypes = typeof NAV_ITEM_TYPES;

export type NavItemDescriptor = {
  name: string;
} & Partial<{
  key: string;
  orderHint: number;
  iconUrl: string;
  routeID: string;
  iconClass: string;
  iconElement: HTMLElement;
  iconPosition: 'BEFORE_NAME';
  /** Font ligature, can't use with an IconUrl */
  iconLiga: string;
  routeParams: Record<string, string | number>;
  expanderForegroundColor: string;
  backgroundColor: string;
  onClick: () => void;
  accessory:
    | CreateAccessoryDescriptor
    | IconButtonAccessoryDescriptor
    | DropdownButtonAccessoryDescriptor
    | null;
  type: keyof NavItemTypes;
  tooltipAlignment: 'left' | 'top' | 'right' | 'bottom' | null;
  subtitle: string;
  spacingAfter: boolean;
  sectionTooltip: string;
}>;

export type NavItemEvent =
  | { eventName: 'collapsed' | 'expanded' | 'orderChanged' }
  | {
      eventName: 'click';
      domEvent: MouseEvent;
    };

// TODO could we recreate this with React? There's so much statefulness that it's

export default class GmailNavItemView {
  private _accessory: any = null;
  private _accessoryViewController: any = null;
  private _driver: GmailDriver;
  private _element: HTMLElement;
  #eventStream: Bus<NavItemEvent, any>;
  private _expandoElement: HTMLElement | null = null;
  private _iconSettings: IconSettings = {};
  private _isActive: boolean = false;
  private _isCollapsed: boolean = false;
  private _itemContainerElement: HTMLElement | null = null;
  private _level: number;
  private _name: string = '';
  private _navItemDescriptor?: NavItemDescriptor;
  private _navItemNumber: number;
  private _orderGroup: number | string;
  private _orderHint: any;
  private _type: string | null = null;
  private _collapseKey: string | null = null;
  #sectionKey?: string;

  // delete after new left nav is fully launched, use this._level === 1 instead
  private _isNewLeftNavParent: boolean;

  get sectionKey() {
    return this.#sectionKey;
  }

  constructor(driver: GmailDriver, orderGroup: number | string, level: number) {
    this._driver = driver;
    this.#eventStream = kefirBus();
    this._level = level || 0;
    this._navItemNumber = ++NUMBER_OF_GMAIL_NAV_ITEM_VIEWS_CREATED;
    this._orderGroup = orderGroup;

    this._isNewLeftNavParent =
      !GmailElementGetter.shouldAddNavItemsInline() && this._level === 1;

    this._element = this.#setupElement();
  }

  #setupElement(navItemDescriptor?: NavItemDescriptor) {
    if (
      this._isNewLeftNavParent &&
      navItemDescriptor?.type !== NAV_ITEM_TYPES.SECTION
    ) {
      return this._setupParentElement();
    } else if (navItemDescriptor?.type === NAV_ITEM_TYPES.SECTION) {
      return this.#setupSectionElement();
    } else {
      return this._setupChildElement();
    }
  }

  addNavItem(
    orderGroup: number | string,
    navItemDescriptor: Kefir.Observable<NavItemDescriptor, unknown>,
  ): GmailNavItemView {
    const nestedNavItemLevel =
      this._type === NAV_ITEM_TYPES.GROUPER || this.isSection()
        ? this._level
        : this._level + 1;
    const gmailNavItemView = new GmailNavItemView(
      this._driver,
      orderGroup,
      nestedNavItemLevel,
    );

    gmailNavItemView
      .getEventStream()
      .filter((event) => event.eventName === 'orderChanged')
      .onValue(() => this._addNavItemElement(gmailNavItemView));

    gmailNavItemView.setNavItemDescriptor(navItemDescriptor);

    if (this._isNewLeftNavParent && !gmailNavItemView.isSection()) {
      this._createExpandoParent();
    }

    return gmailNavItemView;
  }

  #cleanupDOMElements() {
    if (this._accessoryViewController) this._accessoryViewController.destroy();
    if (this._expandoElement) this._expandoElement.remove();
    if (this._itemContainerElement) this._itemContainerElement.remove();
  }

  destroy() {
    this._element.remove();
    if (this.#eventStream) this.#eventStream.end();
    this.#cleanupDOMElements();
  }

  getElement(): HTMLElement {
    return this._element;
  }

  getEventStream() {
    return this.#eventStream;
  }

  getNavItemDescriptor() {
    return this._navItemDescriptor;
  }

  getOrderGroup(): number | string {
    return this._orderGroup;
  }

  getOrderHint(): any {
    return this._orderHint;
  }

  getName(): string {
    return this._name;
  }

  isCollapsed(): boolean {
    return this._isCollapsed;
  }

  isSection() {
    return this._type === NAV_ITEM_TYPES.SECTION;
  }

  remove() {
    this.destroy();
  }

  setActive(value: boolean) {
    if (
      !this._element ||
      this._type === NAV_ITEM_TYPES.LINK ||
      this._type === NAV_ITEM_TYPES.MANAGE ||
      this._isActive === value ||
      this._isNewLeftNavParent ||
      this.isSection()
    ) {
      return;
    }

    const toElement = querySelector(this._element, '.TO');

    if (value) {
      this._element.classList.add('ain');
      toElement.classList.add('nZ');
      toElement.classList.add('aiq');
    } else {
      this._element.classList.remove('ain');
      toElement.classList.remove('nZ');
      toElement.classList.remove('aiq');
    }

    this._setHeights();
    this._isActive = value;
  }

  setCollapsed(value: boolean) {
    this._isCollapsed = value;

    if (this._isCollapsible()) {
      if (value) {
        this._collapse();
      } else {
        this._expand();
      }
    }

    try {
      const storageKey = 'inboxsdk__navitem_collapsed__' + this._collapseKey;
      if (this._isCollapsed) {
        localStorage.setItem(storageKey, 'true');
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (e) {
      console.error('Caught error', e);
    }
  }

  setNavItemDescriptor(
    navItemDescriptorPropertyStream: Kefir.Observable<
      NavItemDescriptor,
      unknown
    >,
  ) {
    navItemDescriptorPropertyStream
      .takeUntilBy(this.#eventStream.filter(() => false).beforeEnd(() => null))
      .onValue((x) => this.#updateValues(x));
  }

  toggleCollapse() {
    this.setCollapsed(!this._isCollapsed);
  }

  // TODO this method is only called on orderChanged? is that right?
  private _addNavItemElement(gmailNavItemView: GmailNavItemView) {
    const itemContainerElement = this._getItemContainerElement();

    const insertBeforeElement = getInsertBeforeElement(
      gmailNavItemView.getElement(),
      itemContainerElement.children,
      ['data-group-order-hint', 'data-order-hint', 'data-insertion-order-hint'],
    );
    itemContainerElement.insertBefore(
      gmailNavItemView.getElement(),
      insertBeforeElement,
    );

    if (gmailNavItemView.isSection() || this.isSection()) {
      return;
    }

    // If the current nav-item is of type GROUPER and we are in Gmailv2, then any nested nav-items
    // should be at the same indentation as the current nav-item. Somewhat confusingly, this._level
    // is normally the indentationFactor for the nested children of the current nav-item, so we
    // actually use this._level - 1 as the indentationFactor if we don't want to further indent the
    // nested items (i.e. the current item is of type GROUPER and we're in Gmailv2).
    const indentationFactor =
      this._type === NAV_ITEM_TYPES.GROUPER || this._isNewLeftNavParent
        ? this._level - 1
        : this._level;

    const element = gmailNavItemView.getElement();

    if (!GmailElementGetter.shouldAddNavItemsInline()) {
      querySelector(element, '.TN').style.marginLeft =
        6 * indentationFactor + 'px';
    } else {
      querySelector(element, '.TN').style.marginLeft =
        getLeftIndentationPaddingValue() * indentationFactor + 'px';
    }

    this._setHeights();
  }

  private _collapse() {
    this._isCollapsed = true;

    if (this._isNewLeftNavParent) {
      this._element.classList.remove('Xr');
    } else {
      const expandoElement = this._expandoElement;
      if (expandoElement) {
        expandoElement.classList.remove('aih');
        expandoElement.classList.add('aii');
      } else if (this._type === NAV_ITEM_TYPES.GROUPER) {
        const navItemElement = this._element.firstElementChild;
        if (navItemElement) navItemElement.classList.remove('air');
      }

      if (this._itemContainerElement)
        this._itemContainerElement.style.display = 'none';

      this._setHeights();
    }

    this.#eventStream.emit({
      eventName: 'collapsed',
    });
  }

  private _createAccessory(accessoryDescriptor: any) {
    switch (accessoryDescriptor.type) {
      case 'CREATE':
        this._createCreateAccessory(accessoryDescriptor);
        break;
      case 'ICON_BUTTON':
        this._createIconButtonAccessory(accessoryDescriptor);
        break;
      case 'DROPDOWN_BUTTON':
        this._createDropdownButtonAccessory(accessoryDescriptor);
        break;
      case 'SETTINGS_BUTTON':
        this._driver
          .getLogger()
          .deprecationWarning(
            'SettingsButtonAccessoryDescriptor',
            'DropdownButtonAccessoryDescriptor',
          );
        this._createDropdownButtonAccessory({
          ...accessoryDescriptor,
          type: 'DROPDOWN_BUTTON',
        });
        break;
    }
  }

  private _createCreateAccessory(accessoryDescriptor: any) {
    this._createPlusButtonAccessory(accessoryDescriptor);
  }

  private _createDropdownButtonAccessory(accessoryDescriptor: any) {
    if (this._isNewLeftNavParent) {
      const buttonOptions: any = { ...accessoryDescriptor };
      buttonOptions.buttonView = new MoreParentDropdownButtonView();
      buttonOptions.dropdownViewDriverClass = GmailDropdownView;
      buttonOptions.dropdownPositionOptions = {
        position: 'right',
        hAlign: 'left',
        vAlign: 'top',
      };
      buttonOptions.dropdownShowFunction = ({ dropdown }: any) => {
        dropdown.el.style.marginLeft = '24px';
        buttonOptions.onClick({ dropdown });
      };

      const accessoryViewController = new DropdownButtonViewController(
        buttonOptions,
      );
      this._accessoryViewController = accessoryViewController;

      const accessoryEl = querySelector(this._element, '.Yh');
      const parentNode = accessoryEl.parentNode;
      if (parentNode) {
        buttonOptions.buttonView
          .getElement()
          .classList.add(...accessoryEl.classList);
        parentNode.replaceChild(
          buttonOptions.buttonView.getElement(),
          accessoryEl,
        );
        this._iconSettings.iconElement = null;
      }

      return;
    }

    // child dropdown button accessory
    const buttonOptions: any = { ...accessoryDescriptor };
    buttonOptions.buttonView = new MoreDropdownButtonView();
    buttonOptions.dropdownViewDriverClass = GmailDropdownView;
    buttonOptions.dropdownPositionOptions = {
      position: 'bottom',
      hAlign: 'left',
      vAlign: 'top',
    };

    const container = GmailElementGetter.getLeftNavContainerElement();
    if (!container) throw new Error('leftNavContainer not found');

    buttonOptions.dropdownShowFunction = (event: any) => {
      // bhZ is the class to indicate the left nav is collapsible mode
      // bym is class to show expanded when the left nav is collapsible
      if (container.classList.contains('bhZ')) {
        const stopper = Kefir.fromEvents(event.dropdown, 'destroy');

        // monitor class on the container and keep re-adding bym until dropdown closes
        makeMutationObserverChunkedStream(container, {
          attributes: true,
          attributeFilter: ['class'],
        })
          .takeUntilBy(stopper)
          .toProperty(() => null)
          .onValue(() => {
            if (!container.classList.contains('bym'))
              container.classList.add('bym');
          });

        stopper.onValue(() => {
          container.classList.remove('bym');
        });
      }

      buttonOptions.onClick(event);

      event.dropdown.on('destroy', () => {
        buttonOptions.buttonView.deactivate();
      });
    };

    const accessoryViewController = new DropdownButtonViewController(
      buttonOptions,
    );
    this._accessoryViewController = accessoryViewController;

    const innerElement = querySelector(this._element, '.TO');
    innerElement.addEventListener('mouseenter', () =>
      innerElement.classList.add('inboxsdk__navItem_hover'),
    );
    innerElement.addEventListener('mouseleave', () =>
      innerElement.classList.remove('inboxsdk__navItem_hover'),
    );

    const insertionPoint = querySelector(this._element, '.TN');
    insertionPoint.appendChild(buttonOptions.buttonView.getElement());

    this._setupContextClickHandler(accessoryViewController);
  }

  private _createExpando() {
    if (this._type === NAV_ITEM_TYPES.GROUPER) {
      return;
    }

    const expandoElement = (this._expandoElement =
      document.createElement('div'));

    expandoElement.setAttribute('class', 'TH aih J-J5-Ji inboxsdk__expando');
    expandoElement.setAttribute('role', 'link');
    expandoElement.title = `Expand ${this._name || ''}`;

    expandoElement.addEventListener('click', (e: MouseEvent) => {
      this.toggleCollapse();
      e.stopPropagation();
    });

    const insertionPoint = this._element.querySelector('.TN.aik');

    if (insertionPoint)
      insertionPoint.insertAdjacentElement('afterbegin', expandoElement);

    if (this._isCollapsed) {
      this._collapse();
    } else {
      this._expand();
    }
  }

  private _createExpandoParent() {
    const parentExpandoElement = querySelector(this._element, '.XR');
    parentExpandoElement.style.visibility = 'visible';
    this._expandoElement = parentExpandoElement;

    if (this._isCollapsed) {
      this._collapse();
    } else {
      this._expand();
    }
  }

  private _createIconButtonAccessory(accessoryDescriptor: Object) {
    this._driver
      .getLogger()
      .deprecationWarning(
        'IconButtonAccessoryDescriptor accessory for a parent level NavItemView',
        'CreateAccessoryDescriptor or DropdownButtonAccessoryDescriptor',
      );

    if (this._isNewLeftNavParent) {
      return;
    }

    const buttonOptions: any = {
      ...accessoryDescriptor,
      buttonColor: 'pureIcon',
    };
    buttonOptions.buttonView = new ButtonView(buttonOptions);

    this._accessoryViewController = new BasicButtonViewController(
      buttonOptions,
    );

    const insertionPoint = querySelector(this._element, '.TN');
    insertionPoint.appendChild(buttonOptions.buttonView.getElement());
  }

  private _createItemContainerElement(): HTMLElement {
    const itemContainerElement = (this._itemContainerElement =
      document.createElement('div'));
    itemContainerElement.classList.add('inboxsdk__navItem_container');

    this._element.appendChild(itemContainerElement);

    // If this is a collapsible nav-item, run collapse or expand to set the container styling
    if (this._isCollapsible()) {
      if (this._isCollapsed) this._collapse();
      else this._expand();
    }

    return itemContainerElement;
  }

  private _createLinkButtonAccessory(accessoryDescriptor: any) {
    const linkDiv = document.createElement('div');
    const linkDivClassName = 'inboxsdk__navItem_link';
    linkDiv.setAttribute('class', linkDivClassName);

    const anchor = document.createElement('a');
    anchor.classList.add('CK');
    anchor.textContent = accessoryDescriptor.name;

    linkDiv.appendChild(anchor);

    anchor.href = '#';

    anchor.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      accessoryDescriptor.onClick();
    });

    querySelector(this._element, '.aio').appendChild(linkDiv);
  }

  private _createPlusButtonAccessory(accessoryDescriptor: any) {
    if (this._isNewLeftNavParent) {
      const buttonOptions: any = { ...accessoryDescriptor };
      buttonOptions.buttonView = new CreateParentAccessoryButtonView();

      // TODO: new Gmail left nav parent accessory opens a dropdown which would be a breaking
      // change if we were to also create a dropdown view bc existing users would have to manually
      // close the dropdown if they only wanted a click callback. We could have a "hasDropdown"
      // prop to conditionally render the dropdown, but when is enough enough?
      // buttonOptions.dropdownViewDriverClass = GmailDropdownView;
      // buttonOptions.dropdownPositionOptions = {
      //   position: 'right',
      //   hAlign: 'left',
      //   vAlign: 'top'
      // };
      // buttonOptions.dropdownShowFunction = ({ dropdown }) => {
      //   dropdown.el.style.marginLeft = '24px';
      //   buttonOptions.onClick({ dropdown });
      // };

      this._accessoryViewController = new BasicButtonViewController(
        buttonOptions,
      );

      const accessoryEl = buttonOptions.buttonView.getElement(); // querySelector(this._element, '.Yh');
      const parentNode = accessoryEl.parentNode;
      if (parentNode) {
        buttonOptions.buttonView
          .getElement()
          .classList.add(...accessoryEl.classList);
        parentNode.replaceChild(
          buttonOptions.buttonView.getElement(),
          accessoryEl,
        );
        this._iconSettings.iconElement = null;
      }

      return;
    }

    // child create button accessory
    const buttonOptions = { ...accessoryDescriptor };
    buttonOptions.buttonView = new CreateAccessoryButtonView();

    this._accessoryViewController = new BasicButtonViewController(
      buttonOptions,
    );

    const insertionPoint = querySelector(this._element, '.TN');
    insertionPoint.appendChild(buttonOptions.buttonView.getElement());
  }

  private _expand() {
    if (this._isNewLeftNavParent) {
      this._element.classList.add('Xr');
    } else {
      const expandoElement = this._expandoElement;
      if (expandoElement) {
        expandoElement.classList.add('aih');
        expandoElement.classList.remove('aii');
      } else if (this._type === NAV_ITEM_TYPES.GROUPER) {
        const navItemElement = this._element.firstElementChild;
        if (navItemElement) {
          navItemElement.classList.add('air');
        }
      }

      if (this._itemContainerElement) {
        this._itemContainerElement.style.display = '';
      }

      this._setHeights();
    }

    this._isCollapsed = false;
    this.#eventStream.emit({
      eventName: 'expanded',
    });
  }

  private _getItemContainerElement(): HTMLElement {
    if (this.isSection()) {
      return getSectionNavItemsContainerElement(
        this._element,
        this.#sectionKey,
        this._orderGroup.toString(),
        this._orderHint.toString(),
        this._navItemNumber.toString(),
      );
    } else if (this._isNewLeftNavParent) {
      return querySelector(this._element, '.TK');
    } else {
      let itemContainerElement = this._itemContainerElement;
      if (!itemContainerElement) {
        itemContainerElement = this._createItemContainerElement();
        this._createExpando();
      }

      return itemContainerElement;
    }
  }

  private _isCollapsible() {
    return (
      Boolean(this._expandoElement) || this._type === NAV_ITEM_TYPES.GROUPER
    );
  }

  private _makeEventMapper<U extends string>(
    eventName: U,
  ): <T extends Event>(domEvent: T) => { eventName: U; domEvent: T } {
    return function (domEvent) {
      domEvent.stopPropagation();
      domEvent.preventDefault();

      return {
        eventName,
        domEvent,
      };
    };
  }

  private _setHeights() {
    if (this._level == 1) {
      return;
    }

    const toElement = querySelector(this._element, '.TO');

    if (this._element.classList.contains('ain') && this._itemContainerElement) {
      this._element.style.height = '';

      const totalHeight = this._element.clientHeight;
      const itemHeight = toElement.clientHeight;

      this._element.style.height = itemHeight + 'px';
      this._element.style.overflow = 'visible';
      this._element.style.marginBottom = totalHeight - itemHeight + 'px';
    } else {
      this._element.style.height = '';
      this._element.style.overflow = '';
      this._element.style.marginBottom = '';
    }
  }

  private _setHighlight(value: boolean) {
    if (
      !this._element ||
      this._type === NAV_ITEM_TYPES.LINK ||
      this._type === NAV_ITEM_TYPES.MANAGE
    ) {
      return;
    }

    if (value) {
      querySelector(this._element, '.TO').classList.add('NQ');
    } else {
      querySelector(this._element, '.TO').classList.remove('NQ');
    }
  }

  private _setupContextClickHandler(accessoryViewController: any) {
    Kefir.fromEvents<MouseEvent, never>(this._element, 'contextmenu')
      .takeWhile(
        () => this._accessoryViewController === accessoryViewController,
      )
      .onValue((domEvent) => {
        domEvent.stopPropagation();
        domEvent.preventDefault();

        accessoryViewController.showDropdown();
      });
  }

  #setupSectionElement(): HTMLElement {
    const element = document.createElement('div');
    element.classList.add('aAw', 'FgKVne', NAV_ITEM_SECTION_CLASS_NAME);
    element.dataset.sectionKey = this.#sectionKey;
    element.innerHTML = [
      '<span class="aAv inboxsdk__navItem_name" role="heading">',
      'Labels',
      '</span>',
      '<div class="aAu arN" aria-label="" data-tooltip="" role="button" tabindex="0" type="button">',
      '</div>',
    ].join('');

    const innerElement = querySelector(element, '.aAu');

    this.#eventStream.plug(
      Kefir.fromEvents<MouseEvent, never>(innerElement, 'click').map(
        this._makeEventMapper('click'),
      ),
    );

    return element;
  }

  private _setupChildElement(): HTMLElement {
    const element = document.createElement('div');
    element.setAttribute('class', 'aim inboxsdk__navItem');

    element.innerHTML = [
      '<div class="TO">',
      '<div class="TN aik">',

      // This element needs a style attribute defined on it as there is a Gmail css rule of
      // selecting for "gj[style]" the sets the opacity to 1 rather than 0.6.
      '<div class="qj" style="">',
      '</div>',

      '<div class="aio aip">',
      '<span class="nU" role="link">',
      '</span>',
      // This bsU element is the container "subtitle" text.
      '<span class="bsU">',
      '</span>',
      '</div>',

      '</div>',
      '</div>',
    ].join('');

    const innerElement = querySelector(element, '.TO');

    Kefir.merge<
      {
        eventName: 'mouseenter' | 'mouseleave';
        domEvent: MouseEvent;
      },
      never
    >([
      Kefir.fromEvents<MouseEvent, never>(innerElement, 'mouseenter').map(
        this._makeEventMapper('mouseenter'),
      ),
      Kefir.fromEvents<MouseEvent, never>(innerElement, 'mouseleave').map(
        this._makeEventMapper('mouseleave'),
      ),
    ]).onValue((event) => {
      this._updateHighlight(event);
    });

    this.#eventStream.plug(
      Kefir.fromEvents<MouseEvent, never>(innerElement, 'click').map(
        this._makeEventMapper('click'),
      ),
    );

    return element;
  }

  private _setupParentElement(): HTMLElement {
    const element = document.createElement('div');
    element.className = 'Xa wT W8 XJ inboxsdk__navItem';
    element.innerHTML = [
      '<div class="V6 CL Y2">',
      '<div class="XR" role="button" tabindex="0" type="button" style="visibility: hidden">',
      '</div>',
      '<span class="XS">',
      '<span class="WW inboxsdk__navItem_name" role="heading" aria-level="2">',
      '</span>',
      '<span class="XU" aria-hidden="true" style="display: none">',
      '</span>',
      '</span>',
      '<div class="Yh">',
      '</div>',
      '</div>',
      '<div class="V3 ada">',
      '<div class="wT">',
      '<div class="TK">',
      '</div>',
      '</div>',
      '</div>',
    ].join('');

    // adds shadow rule to nav item container
    const scrollContainer = querySelector(element, '.V3');
    Kefir.fromEvents(scrollContainer, 'scroll')
      .debounce(10)
      .onValue(() => {
        if (scrollContainer.scrollTop > 0) {
          scrollContainer.classList.add('adh');
        } else {
          scrollContainer.classList.remove('adh');
        }
      });

    const expandoElement = querySelector(element, '.XR');
    Kefir.fromEvents<MouseEvent, never>(expandoElement, 'click')
      .map(this._makeEventMapper('click'))
      .onValue(() => {
        this.toggleCollapse();
      });

    const innerElement = querySelector(element, '.V6.CL');
    this.#eventStream.plug(
      Kefir.fromEvents<MouseEvent, never>(innerElement, 'click').map(
        this._makeEventMapper('click'),
      ),
    );

    return element;
  }

  private _setupGrouper() {
    const navItemElement = this._element
      .firstElementChild as HTMLElement | null;
    if (navItemElement) {
      navItemElement.classList.add('n4');

      navItemElement.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation();
        this.toggleCollapse();
      });

      if (this._isCollapsed) {
        this._collapse();
      } else {
        this._expand();
      }
    }

    const iconContainerElement = querySelector(this._element, '.qj');
    iconContainerElement.innerHTML =
      '<div class="G-asx T-I-J3 J-J5-Ji">&nbsp;</div>';
  }

  private _updateAccessory(accessory: any) {
    if (this._accessory === accessory) {
      return;
    }

    if (this._accessoryViewController) {
      this._accessoryViewController.destroy();
      this._accessoryViewController = null;
    }

    if (accessory) {
      this._createAccessory(accessory);
    }

    this._accessory = accessory;
  }

  private _updateClickability(navItemDescriptor: NavItemDescriptor) {
    if (
      navItemDescriptor.type === NAV_ITEM_TYPES.LINK ||
      navItemDescriptor.type === NAV_ITEM_TYPES.MANAGE
    ) {
      this._element.classList.add('inboxsdk__navItem_nonClickable');
    } else {
      this._element.classList.remove('inboxsdk__navItem_nonClickable');
    }
  }

  private _updateHighlight({ eventName }: { eventName: string }) {
    switch (eventName) {
      case 'mouseenter':
        this._setHighlight(true);

        break;
      case 'mouseleave':
        this._setHighlight(false);

        break;
    }
  }

  private _updateIcon(navItemDescriptor: NavItemDescriptor) {
    if (this.isSection()) {
      return;
    }

    const iconContainerElement = this._isNewLeftNavParent
      ? querySelector(this._element, '.Yh')
      : querySelector(this._element, '.qj');

    // render custom icon
    if (navItemDescriptor.iconElement) {
      renderCustomIcon(
        iconContainerElement,
        navItemDescriptor.iconElement,
        navItemDescriptor.iconPosition !== 'BEFORE_NAME',
      );
      return;
    }

    updateIcon(
      this._iconSettings,
      iconContainerElement,
      navItemDescriptor.iconPosition !== 'BEFORE_NAME',
      navItemDescriptor.iconClass,
      navItemDescriptor.iconUrl,
      undefined,
      undefined,
      navItemDescriptor.iconLiga,
    );

    // Setting the border-color of the icon container element while in Gmailv2 will trigger an SDK
    // css rule that will render a circle of border-color if the icon container element has no
    // children i.e. if no iconUrl or iconClass is defined on navItemDescriptor.
    if (navItemDescriptor.backgroundColor) {
      const circleColor = navItemDescriptor.backgroundColor;
      iconContainerElement.style.borderColor = circleColor;
    }
  }

  private _updateName(name: string) {
    if (this._name === name) {
      return;
    }

    const navItemNameElement = querySelector(
      this._element,
      '.inboxsdk__navItem_name',
    );
    navItemNameElement.textContent = name;
    navItemNameElement.setAttribute('title', name);

    this._name = name;

    if (this.isSection()) return;

    if (this._expandoElement) {
      this._expandoElement.title = `Expand ${name}`;
    }

    if (this._navItemDescriptor?.tooltipAlignment) {
      const align = this._navItemDescriptor?.tooltipAlignment[0];
      this._element.firstElementChild?.setAttribute('data-tooltip', name);
      this._element.firstElementChild?.setAttribute(
        'data-tooltip-align',
        align,
      );
    }
  }

  private _updateOrder(navItemDescriptor: NavItemDescriptor) {
    this._element.setAttribute('data-group-order-hint', '' + this._orderGroup);
    this._element.setAttribute(
      'data-insertion-order-hint',
      '' + this._navItemNumber,
    );

    navItemDescriptor.orderHint =
      navItemDescriptor.orderHint || navItemDescriptor.orderHint === 0
        ? navItemDescriptor.orderHint
        : Number.MAX_SAFE_INTEGER;

    if (navItemDescriptor.orderHint !== this._orderHint) {
      this._element.setAttribute(
        'data-order-hint',
        '' + navItemDescriptor.orderHint,
      );

      this.#eventStream.emit({
        eventName: 'orderChanged',
      });
    }

    this._orderHint = navItemDescriptor.orderHint;
  }

  private _updateRole(routeID?: string) {
    if (this.isSection()) {
      return;
    }
    const roleElement = querySelector(this._element, '.V6.CL');

    if (routeID) {
      roleElement.setAttribute('role', 'link');
    } else {
      roleElement.setAttribute('role', 'group');
      roleElement.classList.add('X9');
    }
  }

  private _updateSubtitle(navItemDescriptor: NavItemDescriptor) {
    if (this._isNewLeftNavParent || this.isSection()) {
      return;
    }

    if (
      navItemDescriptor.accessory &&
      !['SETTINGS_BUTTON', 'DROPDOWN_BUTTON'].includes(
        navItemDescriptor.accessory.type,
      ) &&
      navItemDescriptor.type !== NAV_ITEM_TYPES.GROUPER
    ) {
      return;
    }

    querySelector(this._element, '.bsU').innerHTML = autoHtml`${
      navItemDescriptor.subtitle || ''
    }`;
  }

  private _updateType(
    type: keyof typeof NAV_ITEM_TYPES | undefined = NAV_ITEM_TYPES.NAVIGATION,
  ) {
    if (!this._element) {
      return;
    }

    type = type || NAV_ITEM_TYPES.NAVIGATION;
    if (this._type === type) {
      return;
    }

    const nameElement = this._element.querySelector('.inboxsdk__navItem_name');

    switch (type) {
      case NAV_ITEM_TYPES.GROUPER:
      case NAV_ITEM_TYPES.NAVIGATION:
        if (!nameElement || nameElement.tagName !== 'SPAN') {
          querySelector(
            this._element,
            '.nU',
          ).innerHTML += autoHtml`<span class="inboxsdk__navItem_name">${this._name}</span>`;
        }
        break;
      case NAV_ITEM_TYPES.LINK:
      case NAV_ITEM_TYPES.MANAGE:
        if (!nameElement || nameElement.tagName !== 'A') {
          querySelector(
            this._element,
            '.nU',
          ).innerHTML += autoHtml`<a href="#" class="CK inboxsdk__navItem_name">${this._name}</a>`;
        }
        break;
    }

    this._type = type;
  }

  #updateSpacing(navItemDescriptor: NavItemDescriptor) {
    if (this._isNewLeftNavParent) {
      return;
    }

    this._element.classList.toggle('yJ', !!navItemDescriptor.spacingAfter);
  }

  #updateSectionTooltip(navItemDescriptor: NavItemDescriptor) {
    if (!this.isSection()) return;

    const tooltip = navItemDescriptor.sectionTooltip;
    if (tooltip) {
      this._element
        .querySelector('.aAu')
        ?.setAttribute('data-tooltip', tooltip);
      this._element.querySelector('.aAu')?.setAttribute('aria-label', tooltip);
    }
  }

  #updateValues(navItemDescriptor: NavItemDescriptor) {
    if (
      navItemDescriptor.type === NAV_ITEM_TYPES.SECTION &&
      !this.#sectionKey
    ) {
      // Set up section key for the first time for the Section NavItems
      this.#sectionKey = (Math.random() * 10000).toFixed(0);
    }

    if (this._navItemDescriptor?.type !== navItemDescriptor.type) {
      this._element.remove();
      this.#cleanupDOMElements();
      this._element = this.#setupElement(navItemDescriptor);
    }

    this._navItemDescriptor = navItemDescriptor;

    if (this._collapseKey == null) {
      this._collapseKey = navItemDescriptor.key || `${navItemDescriptor.name}`;
      this._isCollapsed =
        localStorage.getItem(
          'inboxsdk__navitem_collapsed__' + this._collapseKey,
        ) === 'true';
    }

    this._updateType(navItemDescriptor.type);
    this._updateName(navItemDescriptor.name);
    this._updateSubtitle(navItemDescriptor);
    this._updateOrder(navItemDescriptor);
    this.#updateSpacing(navItemDescriptor);

    if (this._isNewLeftNavParent) {
      this._updateRole(navItemDescriptor.routeID);
    }

    if (this._type === NAV_ITEM_TYPES.GROUPER) {
      this._setupGrouper();
      return;
    }

    this._updateAccessory(navItemDescriptor.accessory);
    this._updateIcon(navItemDescriptor);
    this._updateClickability(navItemDescriptor);
    this.#updateSectionTooltip(navItemDescriptor);
  }
}

export function getLeftIndentationPaddingValue(): number {
  return GMAIL_V2_LEFT_INDENTATION_PADDING;
}
