/* @flow */

import uniq from 'lodash/uniq';
import escape from 'lodash/escape';
import asap from 'asap';
import {defn} from 'ud';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import type {Stopper} from 'kefir-stopper';

import streamWaitFor from '../../../lib/stream-wait-for';
import makeMutationObserverStream from '../../../lib/dom/make-mutation-observer-stream';
import getInsertBeforeElement from '../../../lib/dom/get-insert-before-element';
import isElementVisible from '../../../../common/isElementVisible';

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
	_ready: Kefir.Observable<GmailToolbarView>;
	_stopper: Stopper;
	_routeViewDriver: RouteViewDriver;
	_buttonViewControllers: Object[];
	_moreMenuItems: Object[];
	_toolbarState: ?string;
	_threadViewDriver: ?GmailThreadView;
	_rowListViewDriver: ?GmailRowListView;
	_isUpdateButtonClassesScheduled: boolean = false;

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

		if (this._getMoveSectionElement()) {
			this._ready = Kefir.constant(this);
		} else {
			this._ready = streamWaitFor(() => !!this._getMoveSectionElement())
				.takeUntilBy(this._stopper)
				.map(() => this)
				.toProperty();
		}

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

	getStopper(): Kefir.Observable<null> {return this._stopper;}
	getElement(): HTMLElement {return this._element;}
	getRouteViewDriver(): RouteViewDriver {return this._routeViewDriver;}

	getThreadViewDriver() {
		return this._threadViewDriver;
	}

	isForRowList(): boolean {
		return this._rowListViewDriver != null;
	}

	isForThread(): boolean {
		return this._threadViewDriver != null;
	}

	getThreadRowViewDrivers() {
		if (!this._rowListViewDriver) {
			console.error('missing this._rowListViewDriver'); //eslint-disable-line no-console
			return new Set();
		}
		return this._rowListViewDriver.getThreadRowViewDrivers();
	}

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
							hasThreadViewDriver: this.isForThread(),
							hasRowListViewDriver: this.isForRowList()
						})
					);

					sectionElement.appendChild(buttonViewController.getView().getElement());

					Kefir.merge([
							Kefir.constant(-1),
							Kefir.later(1000, 1000)
						])
						.map(delay => {
							const duplicates: Object[] = Array.from(sectionElement.children)
								.filter(el =>
									buttonViewController.getView().getElement()
										.getAttribute('data-rowlist-toolbar') ===
									el.getAttribute('data-rowlist-toolbar') &&
									buttonViewController.getView().getElement()
										.getAttribute('data-toolbar-expanded') ===
									el.getAttribute('data-toolbar-expanded')
								)
								.filter(el => el.hasAttribute('data-add-button-debug'))
								.map(el =>
									Object.assign({
										ownedByExtension: !!(el:any).__addButton_ownedByExtension
									}, JSON.parse(el.getAttribute('data-add-button-debug') || 'null'))
								)
								.filter(({title}) =>
									title === buttonDescriptor.title
								);
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

	waitForReady(): Kefir.Observable<GmailToolbarView> {
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

		makeMutationObserverStream(moreButtonElement, {attributes: true, attributeFilter: ['aria-expanded']})
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
		const isIconMode = Array.from(moveSectionElement.querySelectorAll('[role=button]'))
			.some(buttonElement =>
				buttonElement.hasAttribute('title') || buttonElement.hasAttribute('data-tooltip')
			);
		this._element.setAttribute('data-toolbar-icononly', isIconMode ? 'true' : 'false');
	}

	_setupToolbarStateMonitoring(){
		const moveSectionElement = this._getMoveSectionElement();
		if (!moveSectionElement) throw new Error("No move section element");
		makeMutationObserverStream(
				moveSectionElement,
				{attributes: true, attributeFilter: ['style']}
			)
			.takeUntilBy(this._stopper)
			.onValue(mutation => {
				if(mutation.target instanceof HTMLElement && mutation.target.style.display === 'none'){
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
		return this._getSectionElementForButtonSelector('.ar9, .aFh, .aFj, .lR, .nN, .nX, .aFk');
	}

	_getCheckboxSectionElement(): ?HTMLElement {
		return this._getSectionElementForButtonSelector('.T-Jo-auh');
	}

	_getMoveSectionElement(): ?HTMLElement {
		return this._getSectionElementForButtonSelector('.asb, .ase, .ns, .mw');
	}

	_getSectionElementForButtonSelector(buttonSelector: string): ?HTMLElement {
		const sectionElements = this._element.querySelectorAll('.G-Ni');

		for (let ii=0; ii<sectionElements.length; ii++) {
			if (sectionElements[ii].querySelector(buttonSelector)) {
				return sectionElements[ii];
			}
		}

		return null;
	}

	_updateButtonClasses(element: HTMLElement){
		if(this._isUpdateButtonClassesScheduled) return;

		this._isUpdateButtonClassesScheduled = true;
		asap(() => {
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
							if(isElementVisible(current.previousElementSibling)){
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
							if(isElementVisible(current.nextElementSibling)){
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

			this._isUpdateButtonClassesScheduled = false;
		});
	}

	_updateButtonEnabledState(){
		var enabled = this._toolbarState === 'EXPANDED';
		this._buttonViewControllers.forEach(function(buttonViewController){
			buttonViewController.getView().setEnabled(enabled);
		});
	}

	_addMoreItems(){
		this._clearMoreItems();

		if(this._toolbarState !== 'EXPANDED'){
			return;
		}

		this._moreMenuItems.forEach(item => {
			this._addToOpenMoreMenu(item.buttonDescriptor, item.appId);
		});
	}

	_clearMoreItems(){
		const moreMenu = GmailElementGetter.getActiveMoreMenu();
		if(!moreMenu){
			return;
		}

		uniq(this._moreMenuItems.map(x => x.appId))
			.map(appId =>
				moreMenu.querySelector('[data-group-order-hint=' + appId + ']')
			)
			.filter(Boolean)
			.forEach(container => {
				container.remove();
			});
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
		itemElement.setAttribute('orderHint', String(buttonDescriptor.orderHint || 0));

		itemElement.innerHTML = [
			'<div class="J-N-Jz" style="-webkit-user-select: none;">',
				buttonDescriptor.iconUrl ? '<img src="' + escape(buttonDescriptor.iconUrl) + '" />' : '',
				buttonDescriptor.iconClass ? '<span class="inboxsdk__icon ' + escape(buttonDescriptor.iconClass) + '"></span>' : '',
				escape(buttonDescriptor.title),
			'</div>'
		].join('');

		itemElement.addEventListener('mouseenter', function(e: MouseEvent){
			itemElement.classList.add('J-N-JT');
		});

		itemElement.addEventListener('mouseleave', function(e: MouseEvent){
			itemElement.classList.remove('J-N-JT');
		});

		itemElement.addEventListener('click', function(e: MouseEvent){
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
