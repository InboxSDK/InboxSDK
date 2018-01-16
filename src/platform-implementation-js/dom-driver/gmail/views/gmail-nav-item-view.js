/* @flow */

import autoHtml from 'auto-html';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type {Bus} from 'kefir-bus';

import getInsertBeforeElement from '../../../lib/dom/get-insert-before-element';
import querySelector from '../../../lib/dom/querySelectorOrFail';
import eventNameFilter from '../../../lib/event-name-filter';

import NavItemViewDriver from '../../../driver-interfaces/nav-item-view-driver';

import ButtonView from '../widgets/buttons/button-view';
import LabelDropdownButtonView from '../widgets/buttons/label-dropdown-button-view';
import GmailDropdownView from '../widgets/gmail-dropdown-view';

import DropdownButtonViewController from '../../../widgets/buttons/dropdown-button-view-controller';
import BasicButtonViewController from '../../../widgets/buttons/basic-button-view-controller';

import updateIcon from '../../../driver-common/update-icon';

import NAV_ITEM_TYPES from '../../../constants/nav-item-types';

import type GmailDriver from '../gmail-driver';

let NUMBER_OF_GMAIL_NAV_ITEM_VIEWS_CREATED = 0;

const GMAIL_V1_LEFT_INDENTATION_PADDING = 14;
const GMAIL_V2_LEFT_INDENTATION_PADDING = 12;

export default class GmailNavItemView {

	_driver: GmailDriver;
	_navItemDescriptor: Object;
	_element: HTMLElement;
	_eventStream: Bus<any>;
	_itemContainerElement: ?HTMLElement = null;
	_expandoElement: ?HTMLElement = null;
	_isCollapsed: boolean = false;
	_orderGroup: number | string;
	_orderHint: any;
	_type: ?string = null;
	_name: string = '';
	_iconUrl: ?string = null;
	_iconClass: ?string = null;
	_accessory: ?Object = null;
	_accessoryCreated: boolean = false;
	_accessoryViewController: ?Object = null;
	_level: number;
	_navItemNumber: number;
	_isActive: boolean = false;

	constructor(driver: GmailDriver, orderGroup: number | string, level: number){

		this._driver = driver;
		this._orderGroup = orderGroup;
		this._eventStream = kefirBus();
		this._level = level || 0;

		this._navItemNumber = ++NUMBER_OF_GMAIL_NAV_ITEM_VIEWS_CREATED;

		this._setupElement();
	}

	destroy(){
		this._element.remove();
		if(this._eventStream) this._eventStream.end();
		if(this._itemContainerElement) this._itemContainerElement.remove();
		if(this._expandoElement) this._expandoElement.remove();
		if(this._accessoryViewController) this._accessoryViewController.destroy();
	}

	getNavItemDescriptor(): Object {
		return this._navItemDescriptor;
	}

	getElement(): HTMLElement {
		return this._element;
	}

	getEventStream(): Kefir.Observable<Object> {
		return this._eventStream;
	}

	getOrderGroup(): number | string {
		return this._orderGroup;
	}

	getOrderHint(): ?number {
		return this._orderHint;
	}

	getName(): string {
		return this._name;
	}

	setNavItemDescriptor(navItemDescriptorPropertyStream: Kefir.Observable<Object>){
		navItemDescriptorPropertyStream
			.takeUntilBy(this._eventStream.filter(() => false).beforeEnd(() => null))
			.onValue(x => this._updateValues(x));
	}

	addNavItem(orderGroup: number | string, navItemDescriptor: Object): GmailNavItemView {
		var gmailNavItemView = new GmailNavItemView(this._driver, orderGroup, this._level + 1);

		gmailNavItemView
			.getEventStream()
			.filter(eventNameFilter('orderChanged'))
			.onValue(() => this._addNavItemElement(gmailNavItemView));

		gmailNavItemView.setNavItemDescriptor(navItemDescriptor);

		return gmailNavItemView;
	}

	_setHighlight(value: boolean){
		if(!this._element || this._type === NAV_ITEM_TYPES.LINK || this._type === NAV_ITEM_TYPES.MANAGE){
			return;
		}

		if(value){
			querySelector(this._element, '.TO').classList.add('NQ');
		}
		else{
			querySelector(this._element, '.TO').classList.remove('NQ');
		}
	}

	setActive(value: boolean){
		if(!this._element || this._type === NAV_ITEM_TYPES.LINK || this._type === NAV_ITEM_TYPES.MANAGE || this._isActive === value){
			return;
		}

		const toElement = querySelector(this._element, '.TO');

		if(value){
			this._element.classList.add('ain');
			toElement.classList.add('nZ');
			toElement.classList.add('aiq');
		}
		else{
			this._element.classList.remove('ain');
			toElement.classList.remove('nZ');
			toElement.classList.remove('aiq');
		}

		this._setHeights();
		this._isActive = value;
	}

	toggleCollapse(){
		this._toggleCollapse();
	}

	setCollapsed(value: boolean){
		this._isCollapsed = value;

		if(!this._expandoElement){
			return;
		}

		if(value){
			this._collapse();
		}
		else{
			this._expand();
		}
	}

	isCollapsed(): boolean {
		return this._isCollapsed;
	}

	remove(){
		this.destroy();
	}

	_setupElement(){
		this._element = document.createElement('div');
		this._element.setAttribute('class', 'aim inboxsdk__navItem');

		if (this._driver.isGmailV2UI()) {
			this._element.innerHTML = [
				'<div class="TO">',
					'<div class="TN aik">',

						'<div class="qj">',
						'</div>',

						'<div class="aio aip">',
						'</div>',

					'</div>',
				'</div>'
			].join('');
		}
		else {
			this._element.innerHTML = [
				'<div class="TO">',
					'<div class="TN aik">',
						'<div class="aio aip">',

						'</div>',
					'</div>',
				'</div>'
			].join('');
		}

		const innerElement = querySelector(this._element, '.TO');

		Kefir.merge([
			Kefir.fromEvents(innerElement, 'mouseenter').map(this._makeEventMapper('mouseenter')),
			Kefir.fromEvents(innerElement, 'mouseleave').map(this._makeEventMapper('mouseleave'))
		]).onValue((event) => {
			this._updateHighlight(event);
		});

		this._eventStream.plug(Kefir.fromEvents(innerElement, 'click').map(this._makeEventMapper('click')));
	}

	_makeEventMapper(eventName: string): (domEvent: Object) => {eventName: string, domEvent: Object} {
		return function(domEvent){
			domEvent.stopPropagation();
			domEvent.preventDefault();

			return {
				eventName: eventName,
				domEvent: domEvent
			};
		};
	}

	_updateHighlight({eventName}: {eventName: string}) {
		switch (eventName) {
			case 'mouseenter':

				if (this._navItemDescriptor.routeID ||
						typeof this._navItemDescriptor.onClick === 'function') {
					this._setHighlight(true);
				}

				break;
			case 'mouseleave':

				this._setHighlight(false);

				break;
		}
	}

	_updateValues(navItemDescriptor: Object){
		this._navItemDescriptor = navItemDescriptor;

		this._updateType(navItemDescriptor.type);
		this._updateName(navItemDescriptor.name);

		updateIcon(
			this,
			querySelector(this._element, '.aio'),
			navItemDescriptor.iconPosition !== 'BEFORE_NAME',
			navItemDescriptor.iconClass,
			navItemDescriptor.iconUrl
		);

		this._updateAccessory(navItemDescriptor.accessory);
		this._updateOrder(navItemDescriptor);
	}

	_updateType(type: string){
		if(!this._element){
			return;
		}

		type = type || NAV_ITEM_TYPES.NAVIGATION;
		if(this._type === type){
			return;
		}


		var nameElement = this._element.querySelector('.inboxsdk__navItem_name');

		switch(type){
			case NAV_ITEM_TYPES.NAVIGATION:
				if(!nameElement || nameElement.tagName !== 'SPAN'){
					querySelector(this._element, '.aip').innerHTML += autoHtml `<span class="nU n1 inboxsdk__navItem_name" role="link">${this._name}</span>`;
				}
			break;
			case NAV_ITEM_TYPES.LINK:
			case NAV_ITEM_TYPES.MANAGE:
				if(!nameElement || nameElement.tagName !== 'A'){
					querySelector(this._element, '.aip').innerHTML += autoHtml `<a href="#" class="inboxsdk__navItem_name CK">${this._name}</a>`;
				}
			break;
		}

		this._type = type;
	}

	_updateName(name: string){
		if(this._name === name){
			return;
		}

		const navItemNameElement = querySelector(this._element, '.inboxsdk__navItem_name');
		navItemNameElement.textContent = name;
		navItemNameElement.setAttribute('title', name);
		if (this._expandoElement) {
			this._expandoElement.title = `Expand ${name}`;
		}
		this._name = name;
	}

	_updateAccessory(accessory: Object){
		if(this._accessory === accessory){
			return;
		}

		if(this._accessoryViewController){
			this._accessoryViewController.destroy();
			this._accessoryViewController = null;
		}

		if(accessory){
			this._createAccessory(accessory);
		}

		this._accessory = accessory;
	}

	_createAccessory(accessoryDescriptor: Object){
		switch(accessoryDescriptor.type){
			case 'CREATE':
				this._createCreateAccessory(accessoryDescriptor);
			break;
			case 'ICON_BUTTON':
				this._createIconButtonAccessory(accessoryDescriptor);
			break;
			case 'DROPDOWN_BUTTON':
				this._createDropdownButtonAccessory(accessoryDescriptor);
			break;
		}

		this._accessoryCreated = true;
	}

	_createCreateAccessory(accessoryDescriptor: Object){
		accessoryDescriptor.name = '+ New';
		this._createLinkButtonAccessory(accessoryDescriptor);
	}

	_createLinkButtonAccessory(accessoryDescriptor: Object){
		var linkDiv = document.createElement('div');
		linkDiv.setAttribute('class', 'CL inboxsdk__navItem_link');


		var anchor = document.createElement('a');
		anchor.classList.add('CK');
		anchor.textContent = accessoryDescriptor.name;

		linkDiv.appendChild(anchor);

		anchor.href = '#';

		anchor.addEventListener('click', function(e: MouseEvent){
			e.stopPropagation();
			e.preventDefault();

			accessoryDescriptor.onClick();
		});

		querySelector(this._element, '.aio').appendChild(linkDiv);
	}

	_createIconButtonAccessory(accessoryDescriptor: Object){
		const buttonOptions = Object.assign({}, accessoryDescriptor);
		buttonOptions.buttonColor = 'pureIcon';
		buttonOptions.buttonView  = new ButtonView(buttonOptions);


		this._accessoryViewController = new BasicButtonViewController(buttonOptions);

		querySelector(this._element, '.aio').appendChild(buttonOptions.buttonView.getElement());
	}

	_createDropdownButtonAccessory(accessoryDescriptor: Object){
		const buttonOptions = Object.assign({}, accessoryDescriptor);
		buttonOptions.buttonView  = new LabelDropdownButtonView(buttonOptions);
		buttonOptions.dropdownShowFunction = buttonOptions.onClick;
		buttonOptions.dropdownViewDriverClass = GmailDropdownView;
		buttonOptions.dropdownPositionOptions = {
			position: 'bottom', hAlign: 'left', vAlign: 'top'
		};

		const accessoryViewController = new DropdownButtonViewController(buttonOptions);
		this._accessoryViewController = accessoryViewController;

		const innerElement = querySelector(this._element, '.TO');
		innerElement.addEventListener('mouseenter', function(){
			innerElement.classList.add('inboxsdk__navItem_hover');
		});

		innerElement.addEventListener('mouseleave', function(){
			innerElement.classList.remove('inboxsdk__navItem_hover');
		});

		querySelector(this._element, '.aio').appendChild(buttonOptions.buttonView.getElement());

		const self = this;

		Kefir
			.fromEvents(this._element, 'contextmenu')
			.takeWhile(function(){
				return self._accessoryViewController === accessoryViewController;
			})
			.filter(function(domEvent){
				if(domEvent.target === self._element){
					return true;
				}

				const navItems = Array.prototype.filter.call(domEvent.path || [], el => el.classList && el.classList.contains('inboxsdk__navItem'));
				return navItems[0] === self._element;
			})
			.onValue(function(domEvent){
				domEvent.preventDefault();

				accessoryViewController.showDropdown();
			});
	}

	_updateOrder(navItemDescriptor: Object){
		this._element.setAttribute('data-group-order-hint', "" + this._orderGroup);
		this._element.setAttribute('data-insertion-order-hint', "" + this._navItemNumber);

		navItemDescriptor.orderHint = navItemDescriptor.orderHint || navItemDescriptor.orderHint === 0 ? navItemDescriptor.orderHint : Number.MAX_SAFE_INTEGER;

		if(navItemDescriptor.orderHint !== this._orderHint){
			this._element.setAttribute('data-order-hint', "" + navItemDescriptor.orderHint);

			this._eventStream.emit({
				eventName: 'orderChanged'
			});
		}

		this._orderHint = navItemDescriptor.orderHint;
	}

	_addNavItemElement(gmailNavItemView: GmailNavItemView){
		var itemContainerElement = this._getItemContainerElement();

		var insertBeforeElement = getInsertBeforeElement(gmailNavItemView.getElement(), itemContainerElement.children, ['data-group-order-hint', 'data-order-hint', 'data-insertion-order-hint']);
		itemContainerElement.insertBefore(gmailNavItemView.getElement(), insertBeforeElement);

		var element = gmailNavItemView.getElement();
		querySelector(element, '.TO').style.paddingLeft = (getLeftIndentationPaddingValue(this._driver) * this._level) + 'px';

		this._setHeights();
	}

	_getItemContainerElement(): HTMLElement{
		let itemContainerElement = this._itemContainerElement;
		if(!itemContainerElement){
			itemContainerElement = this._createItemContainerElement();
			this._createExpando();
		}

		return itemContainerElement;
	}

	_createItemContainerElement(): HTMLElement {
		const itemContainerElement = this._itemContainerElement = document.createElement('div');
		itemContainerElement.classList.add('inboxsdk__navItem_container');

		this._element.appendChild(itemContainerElement);
		return itemContainerElement;
	}

	_createExpando(){
		const expandoElement = this._expandoElement = document.createElement('div');

		expandoElement.setAttribute('class', 'TH aih J-J5-Ji inboxsdk__expando');
		expandoElement.setAttribute('role', 'link');
		expandoElement.title = `Expand ${this._name || ''}`;

		var self = this;
		expandoElement.addEventListener('click', function(e: MouseEvent){
			self._toggleCollapse();
			e.stopPropagation();
		});

		const insertionPoint = this._driver.isGmailV2UI() ?
			this._element.querySelector('.TN.aik') :
			this._element.querySelector('.aip');

		if(insertionPoint) (insertionPoint: any).insertAdjacentElement('afterbegin', expandoElement);

		if(this._isCollapsed){
			this._collapse();
		}
		else{
			this._expand();
		}
	}

	_toggleCollapse(){
		if(!this._expandoElement){
			this._isCollapsed = !this._isCollapsed;
			return;
		}

		if(this._isCollapsed){
			this._expand();
		}
		else{
			this._collapse();
		}
	}

	_collapse(){
		if(this._expandoElement) this._expandoElement.classList.remove('aih');
		if(this._expandoElement) this._expandoElement.classList.add('aii');

		if(this._itemContainerElement) this._itemContainerElement.style.display = 'none';

		this._isCollapsed = true;

		this._setHeights();

		this._eventStream.emit({
			eventName: 'collapsed'
		});
	}

	_expand(){
		const expandoElement = this._expandoElement;
		if(expandoElement){
			expandoElement.classList.add('aih');
			expandoElement.classList.remove('aii');
		}


		if(this._itemContainerElement) this._itemContainerElement.style.display = '';

		this._isCollapsed = false;

		this._eventStream.emit({
			eventName: 'expanded'
		});

		this._setHeights();
	}

	_isExpanded(): boolean {
		return this._expandoElement ? this._expandoElement.classList.contains('aih') : false;
	}

	_setHeights(){
		const toElement = querySelector(this._element, '.TO');

		if(this._element.classList.contains('ain') && this._itemContainerElement){
			this._element.style.height = '';

			const totalHeight = this._element.clientHeight;
			const itemHeight = toElement.clientHeight;

			this._element.style.height = itemHeight + 'px';
			this._element.style.overflow = 'visible';
			this._element.style.marginBottom = (totalHeight - itemHeight) + 'px';
		}
		else{
			this._element.style.height = '';
			this._element.style.overflow = '';
			this._element.style.marginBottom = '';
		}
	}

}

export function getLeftIndentationPaddingValue(driver: GmailDriver): number {
	return driver.isGmailV2UI() ? GMAIL_V2_LEFT_INDENTATION_PADDING : GMAIL_V1_LEFT_INDENTATION_PADDING;
}
