/* @flow */
//jshint ignore:start

import _ from 'lodash';
import $ from 'jquery';
import {defn} from 'ud';
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
import GmailThreadView from './gmail-thread-view';
import GmailRowListView from './gmail-row-list-view';

import type {RouteViewDriver} from '../../../driver-interfaces/route-view-driver';

import Logger from '../../../lib/logger';

class GmailToolbarView {
	_element: HTMLElement;
	_ready: Kefir.Stream<GmailToolbarView>;
	_stopper: Kefir.Stream&{destroy:Function};
	_routeViewDriver: RouteViewDriver;
	_buttonViewControllers: Object[];
	_moreMenuItems: Object[];
	_toolbarState: ?string;
	_threadViewDriver: ?GmailThreadView;
	_rowListViewDriver: ?GmailRowListView;

	constructor(element: HTMLElement, routeViewDriver: RouteViewDriver, parent: GmailThreadView|GmailRowListView){
		// Important: Multiple GmailToolbarViews will be created for the same
		// toolbar element in preview pane mode! When a GmailToolbarView is
		// created, it adds some attributes to the element corresponding to the
		// GmailToolbarView's type. When addButton is called, the buttons get the
		// same attributes as the GmailToolbarView added. CSS rules are used to
		// hide the buttons with attributes that don't currently match the toolbar
		// element.
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

		if (parent instanceof GmailThreadView) {
			this._threadViewDriver = parent;
			this._ready.onValue(() => {
				this._element.setAttribute('data-thread-toolbar', 'true');
			});
		} else if (parent instanceof GmailRowListView) {
			this._rowListViewDriver = parent;
			this._ready.onValue(() => {
				this._element.setAttribute('data-rowlist-toolbar', 'true');
			});
		} else {
			throw new Error("Invalid parent");
		}
	}

	getStopper(): Kefir.Stream {return this._stopper;}
	getElement(): HTMLElement {return this._element;}
	getRouteViewDriver(): RouteViewDriver {return this._routeViewDriver;}

	getThreadViewDriver(): ?GmailThreadView {return this._threadViewDriver;}
	getRowListViewDriver(): ?GmailRowListView {return this._rowListViewDriver;}

	addButton(buttonDescriptor: Object, toolbarSections: Object, appId: string, id: string){
		this._ready.onValue(() => {
			if(buttonDescriptor.section === toolbarSections.OTHER){
				this._moreMenuItems.push({
					buttonDescriptor: buttonDescriptor,
					appId: appId
				});
				this._addToOpenMoreMenu(buttonDescriptor, appId);
			}
			else{
				const sectionElement = this._getSectionElement(buttonDescriptor.section, toolbarSections);
				if (sectionElement) {
					const buttonViewController = this._createButtonViewController(buttonDescriptor);
					this._buttonViewControllers.push(buttonViewController);

					// Debugging code to track our duplicate toolbar button issue.
					buttonViewController.getView().getElement().__addButton_ownedByExtension = true;
					buttonViewController.getView().getElement().setAttribute(
						'data-add-button-debug',
						JSON.stringify({
							id,
							title: buttonDescriptor.title,
							hasThreadViewDriver: !!this.getThreadViewDriver(),
							hasRowListViewDriver: !!this.getRowListViewDriver()
						})
					);

					sectionElement.appendChild(buttonViewController.getView().getElement());

					Kefir.merge([
							Kefir.constant(null),
							Kefir.later(1000, 1000)
						])
						.map(delay => {
							const duplicates: Object[] = _.chain(sectionElement.children)
								.filter(el => $(el).is(':visible'))
								.filter(el => el.hasAttribute('data-add-button-debug'))
								.map(el =>
									Object.assign({
										ownedByExtension: !!el.__addButton_ownedByExtension
									}, JSON.parse(el.getAttribute('data-add-button-debug')))
								)
								.filter(({title}) =>
									title === buttonDescriptor.title
								)
								.value();
							return {delay, duplicates};
						})
						.filter(({duplicates}) => duplicates.length > 1)
						.take(1)
						.takeUntilBy(this._stopper)
						.onValue(({delay, duplicates}) => {
							Logger.error(new Error("Duplicate toolbar button"), {
								delay, duplicates,
								dataThreadToolbar: this._element.getAttribute('data-thread-toolbar'),
								dataRowlistToolbar: this._element.getAttribute('data-rowlist-toolbar')
							});
						});

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
				 buttonDescriptor.iconUrl ? '<img src="' + _.escape(buttonDescriptor.iconUrl) + '" />' : '',
				 buttonDescriptor.iconClass ? '<span class="inboxsdk__icon ' + _.escape(buttonDescriptor.iconClass) + '"></span>' : '',
				_.escape(buttonDescriptor.title),
			'</div>'
		].join('');

		// :any cast to work around https://github.com/facebook/flow/issues/1155
		(itemElement:any).addEventListener('mouseenter', function(){
			itemElement.classList.add('J-N-JT');
		});

		(itemElement:any).addEventListener('mouseleave', function(){
			itemElement.classList.remove('J-N-JT');
		});

		(itemElement:any).addEventListener('click', function(){

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

export default defn(module, GmailToolbarView);
