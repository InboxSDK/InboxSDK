/* @flow */
//jshint ignore:start

import _ from 'lodash';
import $ from 'jquery';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';

import kefirWaitFor from '../../../lib/kefir-wait-for';
import kefirMakeMutationObserverStream from '../../../lib/dom/kefir-make-mutation-observer-stream';
import getInsertBeforeElement from '../../../lib/dom/get-insert-before-element';

import GmailElementGetter from '../gmail-element-getter';

import ButtonView from '../widgets/buttons/button-view';
import GmailDropdownView from '../widgets/gmail-dropdown-view';
import BasicButtonViewController from '../../../widgets/buttons/basic-button-view-controller';
import DropdownButtonViewController from '../../../widgets/buttons/dropdown-button-view-controller';

import type {RouteViewDriver} from '../../../driver-interfaces/route-view-driver';

import Logger from '../../../lib/logger';

export default class GmailToolbarView {
	_element: HTMLElement;
	_ready: Kefir.Stream<GmailToolbarView>;
	_stopper: Kefir.Stream&{destroy:Function};
	_routeViewDriver: RouteViewDriver;
	_buttonViewControllers: Object[];
	_moreMenuItems: Object[];
	_toolbarState: ?string;
	_threadViewDriver: ?Object;
	_rowListViewDriver: ?Object;

	constructor(element: HTMLElement, routeViewDriver: RouteViewDriver){
		this._element = element;
		this._stopper = kefirStopper();
		this._routeViewDriver = routeViewDriver;
		this._buttonViewControllers = [];
		this._moreMenuItems = [];

		this._ready = kefirWaitFor(() => !!this._getMoveSectionElement())
			.takeUntilBy(this._stopper)
			.map(() => this)
			.toProperty();

		this._ready.onValue(() => {
			this._startMonitoringMoreMenu();
			this._determineToolbarState();
			this._determineToolbarIconMode();
			this._setupToolbarStateMonitoring();
		});
	}

/*
	__memberVariables: [
		{name: '_element', destroy: false},
		{name: '_stopper', destroy: true},
		{name: '_threadViewDriver', destroy: false},
		{name: '_rowListViewDriver', destroy: false},
		{name: '_buttonViewControllers', destroy: false},
		{name: '_parentElement', destroy: false},
		{name: '_toolbarState', destroy: false},
		{name: '_routeViewDriver', destroy: false},
		{name: '_moreMenuItems', destroy: false}
	],
*/

	getStopper(): Kefir.Stream {return this._stopper;}
	getElement(): HTMLElement {return this._element;}
	getRouteViewDriver(): RouteViewDriver {return this._routeViewDriver;}

	getThreadViewDriver(): ?Object {return this._threadViewDriver;}
	setThreadViewDriver(threadViewDriver: Object) {
		this._threadViewDriver = threadViewDriver;

		this._ready.onValue(() => {
			this._element.setAttribute('data-thread-toolbar', 'true');
		});
	}

	getRowListViewDriver(): ?Object {return this._rowListViewDriver;}
	setRowListViewDriver(rowListViewDriver: Object) {
		this._rowListViewDriver = rowListViewDriver;

		this._ready.onValue(() => {
			this._element.setAttribute('data-rowlist-toolbar', 'true');
		});
	}

	addButton(buttonDescriptor: Object, toolbarSections: Object, appId: string){
		this._ready.onValue(() => {
			if(buttonDescriptor.section === toolbarSections.OTHER){
				this._moreMenuItems.push({
					buttonDescriptor: buttonDescriptor,
					appId: appId
				});
				this._addToOpenMoreMenu(buttonDescriptor, appId);
			}
			else{
				var sectionElement = this._getSectionElement(buttonDescriptor.section, toolbarSections);
				if (sectionElement) {
					var buttonViewController = this._createButtonViewController(buttonDescriptor);
					this._buttonViewControllers.push(buttonViewController);

					sectionElement.appendChild(buttonViewController.getView().getElement());

					this._updateButtonClasses(this._element);
					buttonViewController.getView().setEnabled(this._toolbarState === 'EXPANDED');
				}
			}
		});
	}

	waitForReady(): Kefir.Stream<GmailToolbarView> {
		return this._ready;
	}

	_createButtonViewController(buttonDescriptor: Object): Object {
		var buttonView = this._getButtonView(buttonDescriptor);
		buttonDescriptor.buttonView = buttonView;

		var buttonViewController = null;
		if(buttonDescriptor.hasDropdown){
			buttonViewController = new DropdownButtonViewController({
				buttonView: buttonView,
				dropdownViewDriverClass: GmailDropdownView,
				dropdownShowFunction: buttonDescriptor.onClick,
				dropdownPositionOptions: {
					position: 'bottom',
					hAlign: 'right'
				}
			});
		}
		else{
			buttonViewController = new BasicButtonViewController(buttonDescriptor);
		}

		return buttonViewController;
	}

	_getButtonView(buttonDescriptor: Object): Object {
		var buttonView = new ButtonView(buttonDescriptor);

		if(this._rowListViewDriver){
			buttonView.getElement().setAttribute('data-rowlist-toolbar', 'true');
			buttonView.getElement().setAttribute('data-toolbar-expanded', 'true');
		}
		else if(this._threadViewDriver){
			buttonView.getElement().setAttribute('data-thread-toolbar', 'true');
		}

		buttonView.getElement().setAttribute('role', 'button');

		return buttonView;
	}

	_startMonitoringMoreMenu(){
		const moreButtonElement = this._element.querySelector('.nf[role=button]');
		if(!moreButtonElement){
			return;
		}

		kefirMakeMutationObserverStream(moreButtonElement, {attributes: true, attributeFilter: ['aria-expanded']})
			.toProperty(() => null)
			.takeUntilBy(this._stopper)
			.map(() => moreButtonElement.getAttribute('aria-expanded'))
			.filter(ariaExpanded => ariaExpanded === 'true')
			.onValue(() => { this._addMoreItems(); });
	}

	_determineToolbarState(){
		const moveSectionElement = this._getMoveSectionElement();
		if (!moveSectionElement) throw new Error("No move section element");

		if(moveSectionElement.style.display === 'none'){
			this._toolbarState = 'COLLAPSED';
		}
		else{
			this._toolbarState = 'EXPANDED';
		}
	}

	_determineToolbarIconMode(){
		const moveSectionElement = this._getMoveSectionElement();
		if (!moveSectionElement) throw new Error("No move section element");
		const isIconMode = _.any(
			moveSectionElement.querySelectorAll('[role=button]'),
			buttonElement =>
				buttonElement.hasAttribute('title') || buttonElement.hasAttribute('data-tooltip')
		);
		this._element.setAttribute('data-toolbar-icononly', isIconMode ? 'true' : 'false');
	}

	_setupToolbarStateMonitoring(){
		const moveSectionElement = this._getMoveSectionElement();
		if (!moveSectionElement) throw new Error("No move section element");
		kefirMakeMutationObserverStream(
				moveSectionElement,
				{attributes: true, attributeFilter: ['style']}
			)
			.takeUntilBy(this._stopper)
			.onValue(mutation => {
				if(mutation.target.style.display === 'none'){
					this._toolbarState = 'COLLAPSED';
				}
				else{
					this._toolbarState = 'EXPANDED';
				}

				this._updateButtonClasses(this._element);
				this._updateButtonEnabledState();
			});
	}

	_getSectionElement(sectionName: string, toolbarSections: Object): ?HTMLElement {
		switch(sectionName){
			case toolbarSections.INBOX_STATE:
				return this._getArchiveSectionElement();

			case toolbarSections.METADATA_STATE:
				return this._getMoveSectionElement();

			default:
				return null;
		}
	}

	_getArchiveSectionElement(): ?HTMLElement {
		return this._getSectionElementForButtonSelector('.ar9, .aFh, .aFj, .lR, .nN, .nX');
	}

	_getCheckboxSectionElement(): ?HTMLElement {
		return this._getSectionElementForButtonSelector('.T-Jo-auh');
	}

	_getMoveSectionElement(): ?HTMLElement {
		return this._getSectionElementForButtonSelector('.asb, .ase, .ns, .mw');
	}

	_getSectionElementForButtonSelector(buttonSelector: string): ?HTMLElement {
		var sectionElements = this._element.querySelectorAll('.G-Ni');

		for(var ii=0; ii<sectionElements.length; ii++){
			if(!!sectionElements[ii].querySelector(buttonSelector)){
				return sectionElements[ii];
			}
		}

		return null;
	}

	_updateButtonClasses(element: HTMLElement){
		if(this._toolbarState === 'EXPANDED'){
			element.setAttribute('data-toolbar-expanded', 'true');
		}
		else if(this._toolbarState === 'COLLAPSED'){
			element.setAttribute('data-toolbar-expanded', 'false');
		}

		var buttons = element.querySelectorAll('.G-Ni > [role=button]');

		Array.prototype.forEach.call(buttons, function(button){
			var current = button;
			for(var ii=0; ii<100000; ii++){
				if(current.previousElementSibling){
					if(current.previousElementSibling.classList.contains('inboxsdk__button')){
						if($(current.previousElementSibling).is(':visible')){
							button.classList.add('T-I-Js-Gs');
							break;
						}
						else{
							current = current.previousElementSibling;
						}
					}
					else{
						button.classList.add('T-I-Js-Gs');
						break;
					}
				}
				else{
					button.classList.remove('T-I-Js-Gs');
					break;
				}
			}

			current = button;
			for(ii=0; ii<100000; ii++){
				if(current.nextElementSibling){
					if(current.nextElementSibling.classList.contains('inboxsdk__button')){
						if($(current.nextElementSibling).is(':visible')){
							button.classList.add('T-I-Js-IF');
							break;
						}
						else{
							current = current.nextElementSibling;
						}
					}
					else{
						button.classList.add('T-I-Js-IF');
						break;
					}
				}
				else{
					button.classList.remove('T-I-Js-IF');
					break;
				}
			}

		});
	}

	_updateButtonEnabledState(){
		var enabled = this._toolbarState === 'EXPANDED';
		this._buttonViewControllers.forEach(function(buttonViewController){
			buttonViewController.getView().setEnabled(enabled);
		});
	}

	_addMoreItems(){
		var self = this;

		this._clearMoreItems();

		if(this._toolbarState !== 'EXPANDED'){
			return;
		}

		this._moreMenuItems.forEach(function(item){
			self._addToOpenMoreMenu(item.buttonDescriptor, item.appId);
		});
	}

	_clearMoreItems(){
		const moreMenu = GmailElementGetter.getActiveMoreMenu();
		if(!moreMenu){
			return;
		}

		_.chain(this._moreMenuItems)
			.pluck('appId')
			.uniq()
			.map(function(appId){
				return moreMenu.querySelector('[data-group-order-hint=' + appId + ']');
			})
			.compact()
			.each(function(container){
				container.remove();
			}).value();
	}

	_addToOpenMoreMenu(buttonDescriptor: Object, appId: string){
		const moreMenu = GmailElementGetter.getActiveMoreMenu();
		if(!moreMenu){
			return;
		}

		var appDiv = this._getMoreMenuItemsContainer(moreMenu, appId);
		var menuItemElement = this._getMoreMenuItemElement(buttonDescriptor);

		var insertBeforeElement = getInsertBeforeElement(menuItemElement, appDiv.querySelectorAll('[role=menuitem]'), ['data-order-hint']);

		if(insertBeforeElement){
			appDiv.insertBefore(menuItemElement, insertBeforeElement);
		}
		else{
			appDiv.appendChild(menuItemElement);
		}
	}

	_getMoreMenuItemsContainer(moreMenu: HTMLElement, appId: string): HTMLElement {
		var container = moreMenu.querySelector('[data-group-order-hint=' + appId + ']');
		if(container){
			return container;
		}

		container = document.createElement('div');
		container.setAttribute('data-group-order-hint', appId);
		container.innerHTML = '<div class="J-Kh"></div>';

		var containers = moreMenu.querySelectorAll('[data-group-order-hint]');
		var insertBeforeElement = getInsertBeforeElement(container, containers, ['data-group-order-hint']);

		if(insertBeforeElement){
			moreMenu.insertBefore(container, insertBeforeElement);
		}
		else{
			moreMenu.appendChild(container);
		}

		return container;
	}

	_getMoreMenuItemElement(buttonDescriptor: Object): HTMLElement {
		var itemElement = document.createElement('div');
		itemElement.setAttribute('class', 'J-N inboxsdk__menuItem');
		itemElement.setAttribute('role', 'menuitem');
		itemElement.setAttribute('orderHint', buttonDescriptor.orderHint || 0);

		itemElement.innerHTML = [
			'<div class="J-N-Jz" style="-webkit-user-select: none;">',
				 buttonDescriptor.iconUrl ? '<img src="' + buttonDescriptor.iconUrl + '" />' : '',
				 buttonDescriptor.iconClass ? '<span class="inboxsdk__icon ' + buttonDescriptor.iconClass + '"></span>' : '',
				_.escape(buttonDescriptor.title),
			'</div>'
		].join('');

		itemElement.addEventListener('mouseenter', function(){
			itemElement.classList.add('J-N-JT');
		});

		itemElement.addEventListener('mouseleave', function(){
			itemElement.classList.remove('J-N-JT');
		});

		itemElement.addEventListener('click', function(){

			if(buttonDescriptor.onClick){
				buttonDescriptor.onClick();
			}

		});

		return itemElement;
	}

	destroy() {
		var element = this._element;

		if(this._threadViewDriver){
			this._element.removeAttribute('data-thread-toolbar');
		}
		else if(this._rowListViewDriver){
			this._element.removeAttribute('data-rowlist-toolbar');
		}

		this._clearMoreItems();
		this._stopper.destroy();
		this._buttonViewControllers.forEach(button => {
			button.destroy();
		});
		this._buttonViewControllers.length = 0;
		this._updateButtonClasses(element);
	}
}
