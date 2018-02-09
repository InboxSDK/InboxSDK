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
import insertElementInOrder from '../../../lib/dom/insert-element-in-order';
import isElementVisible from '../../../../common/isElementVisible';

import GmailElementGetter from '../gmail-element-getter';

import ButtonView from '../widgets/buttons/button-view';
import GmailDropdownView from '../widgets/gmail-dropdown-view';
import BasicButtonViewController from '../../../widgets/buttons/basic-button-view-controller';
import DropdownButtonViewController from '../../../widgets/buttons/dropdown-button-view-controller';
import GmailThreadView from './gmail-thread-view';
import GmailRowListView from './gmail-row-list-view';

import {SECTION_NAMES} from '../../../constants/toolbars';

import type GmailDriver from '../gmail-driver';
import type {RouteViewDriver} from '../../../driver-interfaces/route-view-driver';

import Logger from '../../../lib/logger';

class GmailToolbarView {
	_element: HTMLElement;
	_driver: GmailDriver;
	_ready: Kefir.Observable<GmailToolbarView>;
	_stopper: Stopper;
	_routeViewDriver: RouteViewDriver;
	_buttonViewControllers: Set<DropdownButtonViewController|BasicButtonViewController> = new Set();
	_moreMenuItems: Array<{buttonDescriptor: Object}> = [];
	_toolbarState: ?string;
	_threadViewDriver: ?GmailThreadView;
	_rowListViewDriver: ?GmailRowListView;
	_isUpdateButtonClassesScheduled: boolean = false;
	_moreMenuItemsContainer: ?HTMLElement = null;

	constructor(element: HTMLElement, driver: GmailDriver, routeViewDriver: RouteViewDriver, parent: GmailThreadView|GmailRowListView){
		// Important: Multiple GmailToolbarViews will be created for the same
		// toolbar element in preview pane mode! When a GmailToolbarView is
		// created, it adds some attributes to the element corresponding to the
		// GmailToolbarView's type. When addButton is called, the buttons get the
		// same attributes as the GmailToolbarView added. CSS rules are used to
		// hide the buttons with attributes that don't currently match the toolbar
		// element.
		this._element = element;
		this._driver = driver;
		this._stopper = kefirStopper();
		this._routeViewDriver = routeViewDriver;

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

	addButton(buttonDescriptor: Object, id?: string): {getStopper(): Kefir.Observable<null>; destroy(): void} {
		const buttonStopper = kefirStopper();

		this._stopper.takeUntilBy(buttonStopper).onValue(() => {
			buttonStopper.destroy();
		});

		const appId = this._driver.getAppId();
		const toolbarSections = SECTION_NAMES;
		this._ready.takeUntilBy(buttonStopper).onValue(() => {
			if(buttonDescriptor.section === toolbarSections.OTHER){
				const entry = {buttonDescriptor};
				this._moreMenuItems.push(entry);
				this._addToOpenMoreMenu(buttonDescriptor);
				buttonStopper.onValue(() => {
					this._moreMenuItems = this._moreMenuItems.filter(_entry => _entry !== entry);
					this._addMoreItems();
				});
			}
			else{
				const sectionElement = this._getSectionElement(buttonDescriptor.section, toolbarSections);
				if (sectionElement) {
					const buttonViewController = this._createButtonViewController(buttonDescriptor);
					this._buttonViewControllers.add(buttonViewController);
					buttonStopper.onValue(() => {
						this._buttonViewControllers.delete(buttonViewController);
						buttonViewController.destroy();
					});

					// Debugging code to track our duplicate toolbar button issue.
					(buttonViewController.getView().getElement():any).__addButton_ownedByExtension = true;
					buttonViewController.getView().getElement().setAttribute(
						'data-add-button-debug',
						JSON.stringify({
							id,
							title: buttonDescriptor.title,
							hasThreadViewDriver: this.isForThread(),
							hasRowListViewDriver: this.isForRowList()
						})
					);

					buttonViewController.getView().getElement().setAttribute('data-order-hint', String(buttonDescriptor.orderHint || 0));
					insertElementInOrder(sectionElement, buttonViewController.getView().getElement());

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

		return {
			getStopper: () => buttonStopper,
			destroy: () => {
				buttonStopper.destroy();
			}
		};
	}

	waitForReady(): Kefir.Observable<GmailToolbarView> {
		return this._ready;
	}

	_createButtonViewController(buttonDescriptor: Object): DropdownButtonViewController|BasicButtonViewController {
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
			.onValue(ariaExpanded => {
				if (ariaExpanded !== 'true') {
					this._clearMoreItems();
				} else {
					this._addMoreItems();
				}
			});
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
		const enabled = this._toolbarState === 'EXPANDED';
		this._buttonViewControllers.forEach(buttonViewController => {
			buttonViewController.getView().setEnabled(enabled);
		});
	}

	_addMoreItems(){
		this._clearMoreItems();

		if(this._toolbarState !== 'EXPANDED'){
			return;
		}

		this._moreMenuItems.forEach(item => {
			this._addToOpenMoreMenu(item.buttonDescriptor);
		});
	}

	_clearMoreItems(){
		if (this._moreMenuItemsContainer) {
			this._moreMenuItemsContainer.remove();
			this._moreMenuItemsContainer = null;
		}
	}

	_addToOpenMoreMenu(buttonDescriptor: Object){
		const moreMenu = GmailElementGetter.getActiveMoreMenu();
		if(!moreMenu){
			return;
		}

		const appDiv = this._getMoreMenuItemsContainer(moreMenu);
		const menuItemElement = this._getMoreMenuItemElement(buttonDescriptor);

		insertElementInOrder(appDiv, menuItemElement);
	}

	_getMoreMenuItemsContainer(moreMenu: HTMLElement): HTMLElement {
		if (this._moreMenuItemsContainer) {
			return this._moreMenuItemsContainer;
		}

		const container = this._moreMenuItemsContainer = document.createElement('div');
		container.setAttribute('data-group-order-hint', this._driver.getAppId());
		container.innerHTML = '<div class="J-Kh"></div>';

		insertElementInOrder(moreMenu, container);

		return container;
	}

	_getMoreMenuItemElement(buttonDescriptor: Object): HTMLElement {
		var itemElement = document.createElement('div');
		itemElement.setAttribute('class', 'J-N inboxsdk__menuItem');
		itemElement.setAttribute('role', 'menuitem');
		itemElement.setAttribute('data-order-hint', String(buttonDescriptor.orderHint || 0));

		itemElement.innerHTML = [
			'<div class="J-N-Jz" style="-webkit-user-select: none;">',
				buttonDescriptor.iconUrl ? '<img class="J-N-JX" src="' + escape(buttonDescriptor.iconUrl) + '" />' : '',
				buttonDescriptor.iconClass ? '<span class="inboxsdk__icon J-N-JX' + escape(buttonDescriptor.iconClass) + '"></span>' : '',
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
				buttonDescriptor.onClick({});
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
		this._updateButtonClasses(element);
	}
}

export default defn(module, GmailToolbarView);
