/* @flow */

import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type {Bus} from 'kefir-bus';

import getInsertBeforeElement from '../../../lib/dom/get-insert-before-element';
import eventNameFilter from '../../../lib/event-name-filter';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
import makeMutationObserverStream from '../../../lib/dom/make-mutation-observer-stream';
import querySelector from '../../../lib/dom/querySelectorOrFail';
import findParent from '../../../../common/find-parent';

import GmailElementGetter from '../gmail-element-getter';

import NavItemViewDriver from '../../../driver-interfaces/nav-item-view-driver';
import GmailNavItemView, {getLeftIndentationPaddingValue} from './gmail-nav-item-view';

import type GmailDriver from '../gmail-driver';

export default class NativeGmailNavItemView {

	_driver: GmailDriver;
	_element: HTMLElement;
	_navItemName: string;
	_activeMarkerElement: ?HTMLElement = null;
	_eventStream: Bus<any>;
	_elementBus: Bus<HTMLElement>;
	_elementStream: Kefir.Observable<HTMLElement>;
	_isActive: boolean = false;
	_itemContainerElement: ?HTMLElement = null;

	constructor(driver: GmailDriver, nativeElement: HTMLElement, navItemName: string) {
		this._driver = driver;
		this._element = nativeElement;
		this._eventStream = kefirBus();
		this._elementBus = kefirBus();
		this._elementStream = this._elementBus.toProperty(() => nativeElement);

		this._navItemName = navItemName;

		// gmail v2 continually replaces the native nav elements
		// so we have to monitor for this replacement and then
		// readd any sub nav items
		const parentElement = nativeElement.parentElement;
		if(parentElement){
			makeMutationObserverChunkedStream((parentElement: any), {childList: true})
				.map(() =>parentElement.querySelector(`.aim a[href*="#${this._navItemName}"]`))
				.filter(Boolean)
				.map(link => findParent(link, el => el.classList.contains('aim')))
				.filter(Boolean)
				.filter(newElement => newElement !== this._element)
				.onValue(newElement => {
					if(newElement){
						const currentContainerElement = this._itemContainerElement;
						if(currentContainerElement){
							//if we have an existing container then remove it
							//so a new one can be created and get things back into a good state
							currentContainerElement.remove();
							this._itemContainerElement = null;
						}
						this._elementBus.emit(newElement);
					}
				});
		}

		this._elementStream.onValue(element => {
			this._element = element;
			this._monitorElementForActiveChanges();
			this.setActive(this._isActive);
		});
	}

	destroy(){
		this._element.classList.remove('inboxsdk__navItem_claimed');
		this._eventStream.end();
		this._elementBus.end();
		if(this._activeMarkerElement) this._activeMarkerElement.remove();
		if(this._itemContainerElement) this._itemContainerElement.remove();
	}

	getElement(): HTMLElement {
		return this._element;
	}

	getEventStream(): Kefir.Observable<Object> {
		return this._eventStream;
	}

	addNavItem(orderGroup: number, navItemDescriptor: Object): GmailNavItemView {
		const gmailNavItemView = new GmailNavItemView(this._driver, orderGroup, 1);

		Kefir.merge([
			gmailNavItemView
				.getEventStream()
				.filter(eventNameFilter('orderChanged')),

			this._elementStream
		])
		.onValue(() => this._addNavItemElement(gmailNavItemView));

		gmailNavItemView.setNavItemDescriptor(navItemDescriptor);

		return gmailNavItemView;
	}

	setActive(value: boolean){
		this._isActive = value;
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
	}

	toggleCollapse(){
		this._toggleCollapse();
	}

	setCollapsed(value: string){
		localStorage['inboxsdk__nativeNavItem__state_' + this._navItemName] = value;

		if(!this._element.querySelector('.inboxsdk__expando')){
			return;
		}

		if(value){
			this._collapse();
		}
		else{
			this._expand();
		}
	}

	remove(){ /* do nothing */ }

	_monitorElementForActiveChanges() {
		this._element.classList.add('inboxsdk__navItem_claimed');
		const element = this._element;
		const classChangeStream = makeMutationObserverChunkedStream(element, {
			attributes: true, attributeFilter: ['class']
		})
			.takeUntilBy(this._eventStream.filter(() => false).beforeEnd(() => null))
			.toProperty(() => [])
			.map(() => element);

		classChangeStream
			.filter(el =>
				el.classList.contains('ain')
			)
			.onValue(() => this._createActiveMarkerElement());

		classChangeStream
			.filter(el =>
				!el.classList.contains('ain')
			)
			.onValue(() => this._removeActiveMarkerElement());
	}

	_addNavItemElement(gmailNavItemView: GmailNavItemView){
		const itemContainerElement = this._getItemContainerElement();

		const insertBeforeElement = getInsertBeforeElement(gmailNavItemView.getElement(), itemContainerElement.children, ['data-group-order-hint', 'data-order-hint', 'data-insertion-order-hint']);
		itemContainerElement.insertBefore(gmailNavItemView.getElement(), insertBeforeElement);

		const element = gmailNavItemView.getElement();
		if (this._driver.isUsingMaterialUI()) {
			querySelector(element, '.TN').style.marginLeft = getLeftIndentationPaddingValue(this._driver) + 'px';
		} else {
			querySelector(element, '.TO').style.paddingLeft = getLeftIndentationPaddingValue(this._driver) + 'px';
		}

		this._setHeights();
	}

	_getItemContainerElement(): HTMLElement {
		let itemContainerElement = this._itemContainerElement;
		if(!itemContainerElement){
			itemContainerElement = this._itemContainerElement = this._element.querySelector('.inboxsdk__navItem_container');
			if(!itemContainerElement){
				itemContainerElement = this._createItemContainerElement();
				this._createExpando();
			}
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
		const link = this._element.querySelector('a');

		const expandoElement = document.createElement('div');
		expandoElement.setAttribute('class', 'TH aih J-J5-Ji inboxsdk__expando');
		expandoElement.setAttribute('role', 'link');
		expandoElement.title = `Expand ${link ? link.title || link.textContent : ''}`;

		expandoElement.addEventListener('click', (e: MouseEvent) => {
			this._toggleCollapse();
			e.stopPropagation();
			e.preventDefault();
			e.stopImmediatePropagation();
		}, true);

		if(this._driver.isUsingMaterialUI()){
			const insertionPoint = this._element.querySelector('.TN');
			if(insertionPoint) (insertionPoint: any).insertAdjacentElement('afterbegin', expandoElement);
		}
		else {
			const insertionPoint = this._element.querySelector('.nU');
			if(insertionPoint) (insertionPoint: any).insertAdjacentElement('beforebegin', expandoElement);
		}

		if(localStorage['inboxsdk__nativeNavItem__state_' + this._navItemName] === 'collapsed'){
			this._collapse();
		}
		else{
			this._expand();
		}
	}

	_toggleCollapse(){
		if(!this._element.querySelector('.inboxsdk__expando')){
			if(localStorage['inboxsdk__nativeNavItem__state_' + this._navItemName] === 'collapsed'){
				localStorage['inboxsdk__nativeNavItem__state_' + this._navItemName] = 'expanded';
			}
			else{
				localStorage['inboxsdk__nativeNavItem__state_' + this._navItemName] = 'collapsed';
			}
			return;
		}

		if(localStorage['inboxsdk__nativeNavItem__state_' + this._navItemName] === 'collapsed'){
			this._expand();
		}
		else{
			this._collapse();
		}
	}

	_collapse(){
		const expandoElement = querySelector(this._element, '.inboxsdk__expando');
		expandoElement.classList.remove('aih');
		expandoElement.classList.add('aii');

		if(this._itemContainerElement) this._itemContainerElement.style.display = 'none';

		localStorage.setItem('inboxsdk__nativeNavItem__state_' + this._navItemName, 'collapsed');

		this._eventStream.emit({
			eventName: 'collapsed'
		});

		this._setHeights();
	}

	_expand(){
		const expandoElement = querySelector(this._element, '.inboxsdk__expando');
		expandoElement.classList.add('aih');
		expandoElement.classList.remove('aii');

		if(this._itemContainerElement) this._itemContainerElement.style.display = '';

		localStorage.setItem('inboxsdk__nativeNavItem__state_' + this._navItemName, 'expanded');

		this._eventStream.emit({
			eventName: 'expanded'
		});

		this._setHeights();
	}

	_isExpanded(): boolean {
		return !!this._element.querySelector('.inboxsdk__expando.aih');
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

	_createActiveMarkerElement(){
		this._removeActiveMarkerElement();

		const activeMarkerElement = this._activeMarkerElement = document.createElement('div');
		activeMarkerElement.classList.add('inboxsdk__navItem_marker');
		activeMarkerElement.classList.add('ain');
		activeMarkerElement.innerHTML = '&nbsp;';

		this._element.insertBefore(activeMarkerElement, this._element.firstElementChild);
	}

	_removeActiveMarkerElement(){
		const activeMarkerElement = this._activeMarkerElement;
		if(activeMarkerElement){
			activeMarkerElement.remove();
			this._activeMarkerElement = null;
		}
	}

}
