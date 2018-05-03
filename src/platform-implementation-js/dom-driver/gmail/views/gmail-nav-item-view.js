/* @flow */

import autoHtml from 'auto-html';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type {Bus} from 'kefir-bus';

import GmailElementGetter from '../gmail-element-getter';

import getInsertBeforeElement from '../../../lib/dom/get-insert-before-element';
import querySelector from '../../../lib/dom/querySelectorOrFail';
import eventNameFilter from '../../../lib/event-name-filter';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';

import NavItemViewDriver from '../../../driver-interfaces/nav-item-view-driver';

import ButtonView from '../widgets/buttons/button-view';
import ArrowDropdownButtonView from '../widgets/buttons/arrow-dropdown-button-view';
import LabelDropdownButtonView from '../widgets/buttons/label-dropdown-button-view';
import CreateAccessoryButtonView from '../widgets/buttons/create-accessory-button-view';
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
	_accessory: ?Object = null;
	_accessoryCreated: boolean = false;
	_accessoryViewController: ?Object = null;
	_level: number;
	_navItemNumber: number;
	_isActive: boolean = false;
	_iconSettings: Object = {};

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
		const nestedNavItemLevel = (this._type === NAV_ITEM_TYPES.GROUPER && this._driver.isUsingMaterialUI()) ? this._level : (this._level + 1);
		const gmailNavItemView = new GmailNavItemView(this._driver, orderGroup, nestedNavItemLevel);

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

		if(!this._isCollapsible()){
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

		if (this._driver.isUsingMaterialUI()) {
			this._element.innerHTML = [
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
				'</div>'
			].join('');
		}
		else {
			this._element.innerHTML = [
				'<div class="TO">',
					'<div class="TN aik">',
						'<div class="aio aip">',
							'<span class="nU" role="link">',
							'</span>',
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
						typeof this._navItemDescriptor.onClick === 'function' ||
						this._driver.isUsingMaterialUI() ) {
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
		this._updateSubtitle(navItemDescriptor);
		this._updateOrder(navItemDescriptor);

		if (this._type === NAV_ITEM_TYPES.GROUPER && this._driver.isUsingMaterialUI()) {
			this._setupGrouper(navItemDescriptor);
			return;
		}

		this._updateIcon(navItemDescriptor);
		this._updateAccessory(navItemDescriptor.accessory);
		this._updateClickability(navItemDescriptor);
	}

	_updateType(type: string){
		if(!this._element){
			return;
		}

		type = type || NAV_ITEM_TYPES.NAVIGATION;
		if(this._type === type){
			return;
		}


		const nameElement = this._element.querySelector('.inboxsdk__navItem_name');

		switch(type){
			case NAV_ITEM_TYPES.GROUPER:
			case NAV_ITEM_TYPES.NAVIGATION:
				if(!nameElement || nameElement.tagName !== 'SPAN'){
					querySelector(this._element, '.nU').innerHTML += autoHtml `<span class="inboxsdk__navItem_name">${this._name}</span>`;
				}
			break;
			case NAV_ITEM_TYPES.LINK:
			case NAV_ITEM_TYPES.MANAGE:
				if(!nameElement || nameElement.tagName !== 'A'){
					querySelector(this._element, '.nU').innerHTML += autoHtml `<a href="#" class="CK inboxsdk__navItem_name">${this._name}</a>`;
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

	_updateIcon(navItemDescriptor: Object) {
		const iconContainerElement = this._driver.isUsingMaterialUI() ?
			querySelector(this._element, '.qj') :
			querySelector(this._element, '.aio');

		updateIcon(
			this._iconSettings,
			iconContainerElement,
			navItemDescriptor.iconPosition !== 'BEFORE_NAME',
			navItemDescriptor.iconClass,
			navItemDescriptor.iconUrl
		);

		// Setting the border-color of the icon container element while in Gmailv2 will trigger an SDK
		// css rule that will render a circle of border-color if the icon container element has no
		// children i.e. if no iconUrl or iconClass is defined on navItemDescriptor.
		if (this._driver.isUsingMaterialUI() && (
				navItemDescriptor.backgroundColor ||
				(navItemDescriptor.accessory && navItemDescriptor.accessory.buttonBackgroundColor)
			)) {
			const circleColor = navItemDescriptor.backgroundColor || navItemDescriptor.accessory.buttonBackgroundColor;
			iconContainerElement.style.borderColor = circleColor;
		}
	}

	_updateClickability(navItemDescriptor: Object) {
		if (!this._driver.isUsingMaterialUI()) return;

		if (navItemDescriptor.type === NAV_ITEM_TYPES.LINK
			|| navItemDescriptor.type === NAV_ITEM_TYPES.MANAGE
			|| (
				!navItemDescriptor.routeID &&
				typeof navItemDescriptor.onClick !== 'function' &&
				!this._driver.isUsingMaterialUI()
			)) {

			this._element.classList.add('inboxsdk__navItem_nonClickable');
		}
		else {
			this._element.classList.remove('inboxsdk__navItem_nonClickable');
		}
	}

	_updateSubtitle(navItemDescriptor: Object) {
		if (
			!this._driver.isUsingMaterialUI() || (
				navItemDescriptor.accessory &&
				!['SETTINGS_BUTTON', 'DROPDOWN_BUTTON'].includes(navItemDescriptor.accessory.type) &&
				navItemDescriptor.type !== NAV_ITEM_TYPES.GROUPER
			)) {
			return;
		}

		querySelector(this._element, '.bsU').innerHTML += autoHtml `${navItemDescriptor.subtitle || ''}`;
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
			case 'SETTINGS_BUTTON':
				this._createSettingsButtonAccessory(accessoryDescriptor);
			break;
		}

		this._accessoryCreated = true;
	}

	_createCreateAccessory(accessoryDescriptor: Object){
		if (this._driver.isUsingMaterialUI()) {
			this._createPlusButtonAccessory(accessoryDescriptor);
		}
		else {
			accessoryDescriptor.name = '+ New';
			this._createLinkButtonAccessory(accessoryDescriptor);
		}
	}

	_createPlusButtonAccessory(accessoryDescriptor: Object){
		const buttonOptions = {...accessoryDescriptor};
		buttonOptions.buttonView  = new CreateAccessoryButtonView(buttonOptions);

		this._accessoryViewController = new BasicButtonViewController(buttonOptions);

		const insertionPoint = querySelector(this._element, '.TN');

		insertionPoint.appendChild(buttonOptions.buttonView.getElement());
	}

	_createLinkButtonAccessory(accessoryDescriptor: Object){
		const linkDiv = document.createElement('div');

		const linkDivClassName = this._driver.isUsingMaterialUI() ?
			'inboxsdk__navItem_link' :
			'CL inboxsdk__navItem_link';

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

	_createIconButtonAccessory(accessoryDescriptor: Object){
		const buttonOptions = {...accessoryDescriptor, buttonColor: 'pureIcon'};
		buttonOptions.buttonView  = new ButtonView(buttonOptions);


		this._accessoryViewController = new BasicButtonViewController(buttonOptions);

		const insertionPoint = this._driver.isUsingMaterialUI() ?
			querySelector(this._element, '.TN') :
			querySelector(this._element, '.aio');

		insertionPoint.appendChild(buttonOptions.buttonView.getElement());
	}

	_createDropdownButtonAccessory(accessoryDescriptor: Object){
		if (!this._driver.isUsingMaterialUI()) {
			this._createSettingsButtonAccessory(accessoryDescriptor);
			return;
		}

		const buttonOptions = {...accessoryDescriptor};
		buttonOptions.buttonView  = new ArrowDropdownButtonView(buttonOptions);
		buttonOptions.dropdownViewDriverClass = GmailDropdownView;
		buttonOptions.dropdownPositionOptions = {
			position: 'bottom', hAlign: 'left', vAlign: 'top'
		};

		if(this._driver.isUsingMaterialUI()){
			const container = GmailElementGetter.getLeftNavContainerElement();
			if(!container) throw new Error('leftNavContainer not found');

			buttonOptions.dropdownShowFunction = (event) => {
				// bhZ is the class to indicate the left nav is collapsible mode
				// bym is class to show expanded when the left nav is collapsible
				if(container.classList.contains('bhZ')){
					const stopper = Kefir.fromEvents(event.dropdown, 'destroy');

					// monitor class on the container and keep re-adding bym until dropdown closes
					makeMutationObserverChunkedStream(container, {attributes: true, attributeFilter: ['class']})
						.takeUntilBy(stopper)
						.toProperty(() => null)
						.onValue(() => {
							if(!container.classList.contains('bym')) container.classList.add('bym');
						});

					stopper.onValue(() => {
						container.classList.remove('bym');
					});
				}

				buttonOptions.onClick(event);
			};

		}
		else {
			buttonOptions.dropdownShowFunction = buttonOptions.onClick;
		}

		const accessoryViewController = new DropdownButtonViewController(buttonOptions);
		this._accessoryViewController = accessoryViewController;

		const innerElement = querySelector(this._element, '.TO');
		innerElement.addEventListener('mouseenter', () => innerElement.classList.add('inboxsdk__navItem_hover'));
		innerElement.addEventListener('mouseleave', () => innerElement.classList.remove('inboxsdk__navItem_hover'));

		const insertionPoint = querySelector(this._element, '.TN');

		insertionPoint.insertBefore(buttonOptions.buttonView.getElement(), insertionPoint.firstElementChild);

		this._setupContextClickHandler(accessoryViewController);
	}

	_createSettingsButtonAccessory(accessoryDescriptor: Object){
		const buttonOptions = {...accessoryDescriptor};
		buttonOptions.buttonView  = new LabelDropdownButtonView(buttonOptions);
		buttonOptions.dropdownViewDriverClass = GmailDropdownView;
		buttonOptions.dropdownPositionOptions = {
			position: 'bottom', hAlign: 'left', vAlign: 'top'
		};
		buttonOptions.dropdownShowFunction = ({dropdown}) => {
			if (this._driver.isUsingMaterialUI()) {
				dropdown.el.style.marginLeft = '16px';
			}

			buttonOptions.onClick({dropdown});
		};

		const accessoryViewController = new DropdownButtonViewController(buttonOptions);
		this._accessoryViewController = accessoryViewController;

		const innerElement = querySelector(this._element, '.TO');
		innerElement.addEventListener('mouseenter', () => innerElement.classList.add('inboxsdk__navItem_hover'));
		innerElement.addEventListener('mouseleave', () => innerElement.classList.remove('inboxsdk__navItem_hover'));

		const insertionPoint = this._driver.isUsingMaterialUI() ?
			querySelector(this._element, '.TN') :
			querySelector(this._element, '.aio');

		insertionPoint.appendChild(buttonOptions.buttonView.getElement());

		this._setupContextClickHandler(accessoryViewController);
	}

	_setupContextClickHandler(accessoryViewController: Object) {
		Kefir
			.fromEvents(this._element, 'contextmenu')
			.takeWhile(() => this._accessoryViewController === accessoryViewController)
			.onValue((domEvent) => {
				domEvent.stopPropagation();
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

	_setupGrouper(navItemDescriptor: Object) {
		const navItemElement = this._element.firstElementChild;
		if (navItemElement) {
			navItemElement.classList.add('n4');

			navItemElement.addEventListener('click', (e: MouseEvent) => {
				e.stopPropagation();
				this._toggleCollapse();
			});

			if(this._isCollapsed){
				this._collapse();
			}
			else{
				this._expand();
			}
		}

		const iconContainerElement = querySelector(this._element, '.qj');
		iconContainerElement.innerHTML = '<div class="G-asx T-I-J3 J-J5-Ji">&nbsp;</div>';
	}

	_addNavItemElement(gmailNavItemView: GmailNavItemView){
		const itemContainerElement = this._getItemContainerElement();

		const insertBeforeElement = getInsertBeforeElement(gmailNavItemView.getElement(), itemContainerElement.children, ['data-group-order-hint', 'data-order-hint', 'data-insertion-order-hint']);
		itemContainerElement.insertBefore(gmailNavItemView.getElement(), insertBeforeElement);

		// If the current nav-item is of type GROUPER and we are in Gmailv2, then any nested nav-items
		// should be at the same indentation as the current nav-item. Somewhat confusingly, this._level
		// is normally the indentationFactor for the nested children of the current nav-item, so we
		// actually use this._level - 1 as the indentationFactor if we don't want to further indent the
		// nested items (i.e. the current item is of type GROUPER and we're in Gmailv2).
		const indentationFactor = (this._type === NAV_ITEM_TYPES.GROUPER && this._driver.isUsingMaterialUI()) ? (this._level - 1) : this._level;

		const element = gmailNavItemView.getElement();
		if (this._driver.isUsingMaterialUI()) {
			querySelector(element, '.TN').style.marginLeft = (getLeftIndentationPaddingValue(this._driver) * indentationFactor) + 'px';
		}
		else {
			querySelector(element, '.TO').style.paddingLeft = (getLeftIndentationPaddingValue(this._driver) * indentationFactor) + 'px';
		}

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
		if (this._type === NAV_ITEM_TYPES.GROUPER && this._driver.isUsingMaterialUI()) return;

		const expandoElement = this._expandoElement = document.createElement('div');

		expandoElement.setAttribute('class', 'TH aih J-J5-Ji inboxsdk__expando');
		expandoElement.setAttribute('role', 'link');
		expandoElement.title = `Expand ${this._name || ''}`;

		expandoElement.addEventListener('click', (e: MouseEvent) => {
			this._toggleCollapse();
			e.stopPropagation();
		});

		const insertionPoint = this._driver.isUsingMaterialUI() ?
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
		if(!this._isCollapsible()){
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

	_isCollapsible() {
		return Boolean(this._expandoElement) || (this._type === NAV_ITEM_TYPES.GROUPER && this._driver.isUsingMaterialUI());
	}

	_collapse(){
		const expandoElement = this._expandoElement;
		if(expandoElement) {
			expandoElement.classList.remove('aih');
			expandoElement.classList.add('aii');
		}
		else if (this._type === NAV_ITEM_TYPES.GROUPER && this._driver.isUsingMaterialUI()) {
			const navItemElement = this._element.firstElementChild;
			if (navItemElement) navItemElement.classList.remove('air');
		}

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
		else if (this._type === NAV_ITEM_TYPES.GROUPER && this._driver.isUsingMaterialUI()) {
			const navItemElement = this._element.firstElementChild;
			if (navItemElement) navItemElement.classList.add('air');
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
	return driver.isUsingMaterialUI() ? GMAIL_V2_LEFT_INDENTATION_PADDING : GMAIL_V1_LEFT_INDENTATION_PADDING;
}
