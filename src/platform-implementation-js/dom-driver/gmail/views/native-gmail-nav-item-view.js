/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type {Bus} from 'kefir-bus';

import getInsertBeforeElement from '../../../lib/dom/get-insert-before-element';
import eventNameFilter from '../../../lib/event-name-filter';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
import makeMutationObserverStream from '../../../lib/dom/make-mutation-observer-stream';
import querySelector from '../../../lib/dom/querySelectorOrFail';

import GmailElementGetter from '../gmail-element-getter';

import NavItemViewDriver from '../../../driver-interfaces/nav-item-view-driver';
import GmailNavItemView from './gmail-nav-item-view';

const LEFT_INDENTATION_PADDING = 14;

export default class NativeGmailNavItemView {

	_element: HTMLElement;
	_navItemName: string;
	_activeMarkerElement: ?HTMLElement = null;
	_eventStream: Bus<any>;
	_itemContainerElement: ?HTMLElement = null;

	constructor(nativeElement: HTMLElement, navItemName: string) {
		this._element = nativeElement;
		this._eventStream = kefirBus();

		this._navItemName = navItemName;

		this._monitorElementForActiveChanges();
	}

	destroy(){
		this._element.classList.remove('inboxsdk__navItem_claimed');
		this._eventStream.end();
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
		var gmailNavItemView = new GmailNavItemView(orderGroup, 1);

		gmailNavItemView
			.getEventStream()
			.filter(eventNameFilter('orderChanged'))
			.onValue(x => this._addNavItemElement(gmailNavItemView, x));

		gmailNavItemView.setNavItemDescriptor(navItemDescriptor);

		return gmailNavItemView;
	}

	setActive(value: boolean){
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
		var element = this._element;
		var classChangeStream = makeMutationObserverChunkedStream(element, {
			attributes: true, attributeFilter: ['class']
		})
			.takeUntilBy(this._eventStream.filter(() => false).beforeEnd(() => null))
			.toProperty(() => [])
			.map(_.constant(element));

		classChangeStream
			.filter(el =>
				el.classList.contains('ain')
			)
			.onValue((e) => this._createActiveMarkerElement(e));

		classChangeStream
			.filter(el =>
				!el.classList.contains('ain')
			)
			.onValue((e) => this._removeActiveMarkerElement(e));

		const parentElement = element.parentElement;
		if(parentElement){
			this._eventStream.plug(
					makeMutationObserverStream((parentElement: any), {childList: true})
						.map(mutation =>
							_.toArray(mutation.removedNodes)
						)
						.flatten()
					.filter(removedNode =>
						removedNode === element
					)
					.map(_.constant({eventName: 'invalidated'}))
			);
		}
	}

	_addNavItemElement(gmailNavItemView: GmailNavItemView){
		var itemContainerElement = this._getItemContainerElement();

		var insertBeforeElement = getInsertBeforeElement(gmailNavItemView.getElement(), itemContainerElement.children, ['data-group-order-hint', 'data-order-hint', 'data-insertion-order-hint']);
		itemContainerElement.insertBefore(gmailNavItemView.getElement(), insertBeforeElement);

		var element = gmailNavItemView.getElement();
		querySelector(element, '.TO').style.paddingLeft = LEFT_INDENTATION_PADDING + 'px';

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

		const insertionPoint = this._element.querySelector('.nU');
		if(insertionPoint) (insertionPoint: any).insertAdjacentElement('beforebegin', expandoElement);

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
