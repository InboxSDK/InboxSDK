/* @flow */

import _ from 'lodash';
import asap from 'asap';
import {defn} from 'ud';
import autoHtml from 'auto-html';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import React from 'react';
import ReactDOM from 'react-dom';
import findParent from '../../../../common/find-parent';
import delayAsap from '../../../lib/delay-asap';
import fromEventTargetCapture from '../../../lib/from-event-target-capture';
import OrderManager from 'order-manager';
import idMap from '../../../lib/idMap';
import incrementName from '../../../lib/incrementName';
import querySelector from '../../../lib/dom/querySelectorOrFail';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
import makeElementChildStream from '../../../lib/dom/make-element-child-stream';
import simulateClick from '../../../lib/dom/simulate-click';
import fakeWindowResize from '../../../lib/fake-window-resize';
import type GmailDriver from '../gmail-driver';

import AppSidebar from '../../../driver-common/sidebar/AppSidebar';
import ContentPanelViewDriver from '../../../driver-common/sidebar/ContentPanelViewDriver';
import GmailElementGetter from '../gmail-element-getter';

import addIconArea from './gmail-app-sidebar-view/add-icon-area';
import addToIconArea from './gmail-app-sidebar-view/add-to-icon-area';

const TAB_LIST_SELECTOR = '.J-KU-Jg';
const ADD_ON_SIDEBAR_CONTENT_SELECTOR = '.J-KU-Jz';
const ACTIVE_ADD_ON_ICON_SELECTOR = '.J-KU-KO';

class GmailAppSidebarView {
	_stopper = kefirStopper();
	_driver: GmailDriver;
	_sidebarContainerEl: ?HTMLElement;
	_addonSidebarContainerEl: ?HTMLElement;
	_instanceId: string;

	constructor(driver: GmailDriver, sidebarContainerEl?: ?HTMLElement, addonSidebarElement: ?HTMLElement) {
		this._driver = driver;
		this._sidebarContainerEl = sidebarContainerEl;
		this._addonSidebarContainerEl = addonSidebarElement;

		// We need to be able to cooperate with other apps/extensions that are
		// sharing the app sidebar. We store some properties as attributes in the
		// shared DOM instead of as class properties; class properties are mostly
		// restricted to being used for references to DOM nodes. When
		// GmailAppSidebarView is instantiated, we check the element for an
		// attribute to see whether a previous extension's GmailAppSidebarView has
		// already set up the sidebar or not.
		const idElement = addonSidebarElement || sidebarContainerEl;
		if(!idElement) throw new Error('should not happen');
		const instanceId = idElement.getAttribute('data-sdk-sidebar-instance-id');
		if (instanceId != null) {
			this._instanceId = instanceId;
		} else {
			this._createElement();
		}
	}

	destroy() {
		this._stopper.destroy();
	}

	getStopper(): Kefir.Observable<*> {
		return this._stopper;
	}

	// This value controls whether the app sidebar should automatically open
	// itself when available when the chat sidebar isn't present. It's only set
	// if the user interacts with the app sidebar button.
	_getShouldAppSidebarOpen(): boolean {
		return global.localStorage.getItem('inboxsdk__app_sidebar_should_open') === 'true';
	}

	_setShouldAppSidebarOpen(open: boolean) {
		try {
			global.localStorage.setItem('inboxsdk__app_sidebar_should_open', String(open));
		} catch(err) {
			console.error('error saving', err);
		}
	}

	_createElement() {
		let container, iconArea;
		let component: AppSidebar;

		this._instanceId = `${Date.now()}-${Math.random()}`;

		{
			const idElement = this._addonSidebarContainerEl || this._sidebarContainerEl;
			if(!idElement) throw new Error('should not happen');
			idElement.setAttribute('data-sdk-sidebar-instance-id', this._instanceId);
		}

		const el = document.createElement('div');
		el.className = idMap('app_sidebar_container');

		const addonSidebarContainerEl = this._addonSidebarContainerEl;
		const sidebarContainerEl = addonSidebarContainerEl || this._sidebarContainerEl;

		if(!sidebarContainerEl) throw new Error('should not happen');

		let contentContainer;
		sidebarContainerEl.classList.add(idMap('app_sidebar_in_use'));

		const buttonContainers: Map<string, HTMLElement> = new Map();
		let activatedWhileLoading: boolean = false;

		if(addonSidebarContainerEl){
			const mainContentBodyContainerElement = GmailElementGetter.getMainContentBodyContainerElement();
			if(mainContentBodyContainerElement){
				contentContainer = mainContentBodyContainerElement.parentElement;
				if(contentContainer) {
					contentContainer.classList.add('container_app_sidebar_in_use');
					querySelector(addonSidebarContainerEl, ADD_ON_SIDEBAR_CONTENT_SELECTOR).insertAdjacentElement('beforebegin', el);
				}
			}
		}
		else {
			sidebarContainerEl.insertBefore(el, sidebarContainerEl.firstElementChild);
		}

		if (!((document.body:any):HTMLElement).querySelector('.'+idMap('app_sidebar_waiting_platform'))) {
			const waitingPlatform = document.createElement('div');
			waitingPlatform.className = idMap('app_sidebar_waiting_platform');
			((document.body:any):HTMLElement).appendChild(waitingPlatform);
		}

		if(addonSidebarContainerEl) {
      container = () => el;
      el.classList.add('addon_sidebar');
    }
    else {
			const containerEl = findParent(sidebarContainerEl, el => window.getComputedStyle(el).overflowY !== 'visible');
			container = containerEl ? (() => containerEl) : undefined;
		}

		const currentIds = new Set();
		const orderManager = new OrderManager({
			get() {
				try {
					return JSON.parse(global.localStorage.getItem('inboxsdk__sidebar_ordering') || 'null');
				} catch (err) {
					console.error('failed to read sidebar order data', err);
				}
			},
			set(data) {
				try {
					global.localStorage.setItem('inboxsdk__sidebar_ordering', JSON.stringify(data));
				} catch (err) {
					console.error('failed to set sidebar order data', err);
				}
			}
		});

		const render = () => {
			component = (ReactDOM.render(
				<AppSidebar
					panels={orderManager.getOrderedItems().map(x => x.value)}
					onMoveEnd={(newList, movedItem, oldIndex, newIndex) => {
						orderManager.moveItem(oldIndex, newIndex);
						render();
					}}
					container={container}
				/>,
				el
			): any);
		};
		render();

		Kefir.fromEvents(window, 'storage')
			.filter(e => e.key === 'inboxsdk__sidebar_ordering')
			.takeUntilBy(this._stopper)
			.onValue(() => {
				orderManager.reload();
				render();
			});

		this._stopper.onValue(() => {
			ReactDOM.unmountComponentAtNode(el);
			el.remove();
			sidebarContainerEl.classList.remove(idMap('app_sidebar_in_use'));
			sidebarContainerEl.classList.remove('app_sidebar_visible');
			if(iconArea) iconArea.remove();

			const mainContentBodyContainerElement = GmailElementGetter.getMainContentBodyContainerElement();
			if(mainContentBodyContainerElement){
				contentContainer = mainContentBodyContainerElement.parentElement;
				if(contentContainer) {
					contentContainer.classList.remove('container_app_sidebar_in_use');
				}
			}
		});

		Kefir.fromEvents((document.body:any), 'inboxsdkNewSidebarPanel')
			.filter(e => e.detail.sidebarId === this._instanceId)
			.takeUntilBy(this._stopper)
			.onValue(event => {
				let id = event.detail.id;
				while (currentIds.has(id)) {
					id = incrementName(id);
				}
				currentIds.add(id);

        const appName = event.detail.appName;
        orderManager.addItem({
					groupId: event.detail.appId,
					id,
					orderHint: event.detail.orderHint,
					value: {
						id, appName,
						appId: event.detail.appId,
						instanceId: event.detail.instanceId,
						title: event.detail.title,
						iconClass: event.detail.iconClass,
						iconUrl: event.detail.iconUrl,
						hideTitleBar: event.detail.hideTitleBar,
						el: event.target
					}
				});
				render();

				if(!addonSidebarContainerEl) return;

        iconArea = addonSidebarContainerEl.querySelector('.'+idMap('sidebar_iconArea'));
        if (!iconArea) {
          iconArea = document.createElement('div');
          iconArea.className = idMap('sidebar_iconArea');
          addIconArea(iconArea, addonSidebarContainerEl, this._stopper);
        }

				// we put adding the content panel icon in the iconArea in an asap so that we
				// get consistent ordering. The ordering of the icons is based on the position of the FIRST
				// panel with that app name. This means we need to wait for all the panels for a particular appName
				// to be added first, and then we can get the correct position
        asap(() => {
					if(!iconArea) throw new Error('should not happen');
          const instanceId = event.detail.instanceId;
  				const appIconUrl = event.detail.appIconUrl;

  				// If there's an existing button for the app, then just increment its
  				// data-count attribute instead of adding a new button.
  				const existingButtonContainer = buttonContainers.get(appName);

  				let container;
  				if (existingButtonContainer) {
  					const currentCount = Number(existingButtonContainer.getAttribute('data-count')) || 1;
  					existingButtonContainer.setAttribute('data-count', String(currentCount+1));
  					container = existingButtonContainer;
  				} else {
  					container = document.createElement('div');
  					container.className = idMap('sidebar_button_container');
            container.setAttribute('data-app-name', appName);
  					container.innerHTML = autoHtml `
  						<button class="inboxsdk__button_icon" type="button" data-tooltip="${appName}">
  							<img class="inboxsdk__button_iconImg" src="${appIconUrl}">
  						</button>
  					`;

  					buttonContainers.set(appName, container);

  					querySelector(container, 'button').addEventListener('click', (event: MouseEvent) => {
							event.stopPropagation();

  						const activeButtonContainer = iconArea ? iconArea.querySelector('.sidebar_button_container_active') : null;
              if(activeButtonContainer){
                activeButtonContainer.classList.remove('sidebar_button_container_active');
              }

  						if(activeButtonContainer === container) {
  							addonSidebarContainerEl.classList.remove('app_sidebar_visible');
  							this._setShouldAppSidebarOpen(false);
  						}
  						else {
  							addonSidebarContainerEl.classList.add('app_sidebar_visible');
  							container.classList.add('sidebar_button_container_active');

  							this._setShouldAppSidebarOpen(true);

  							// check and deactivate add-on sidebar
  							const activeAddOnIcon = addonSidebarContainerEl.querySelector(ACTIVE_ADD_ON_ICON_SELECTOR);
  							if(activeAddOnIcon) simulateClick(activeAddOnIcon);

  							//fake resize to get gmail to fix any heights that are messed up
  							fakeWindowResize();

  							// if the tabList is still loading then handle the case where the user
								// clicks on an SDK icon to bring up an SDK app when Gmail thinks that it needs
								// to bring up an Add-On sidebar (since that was last visible from Gmail's perspective)
								// so we need to suppress Gmail bringing up their sidebar. This handles the flag of if we
								// need to suppress
  							const loadingHolderAsAny: any = querySelector(addonSidebarContainerEl, '.bqI').parentElement;
  							const loadingHolder = (loadingHolderAsAny: ?HTMLElement);
  							if(!loadingHolder) return;

  							if(loadingHolder.style.display !== 'none'){
  								activatedWhileLoading = true;
									makeMutationObserverChunkedStream(loadingHolder, {attributes: true, attributeFilter: ['style']})
  									.toProperty(() => null)
  									.map(() => loadingHolder.style.display === 'none')
  									.filter(Boolean)
  									.take(1)
										.delay(150)
  									.takeUntilBy(this._stopper)
  									.onValue(() => {
											activatedWhileLoading = false;
  									});
  							}

								component.scrollPanelIntoView(instanceId, true);
  						}
  					}, true);


            if(iconArea) addToIconArea(orderManager, appName, container, iconArea);

  					if(this._getShouldAppSidebarOpen()){
							// if we last had an SDK sidebar open then bring up the SDK sidebar when the first
							// panel gets added
							const activeButtonContainer = iconArea.querySelector('.sidebar_button_container_active');
  						if(!activeButtonContainer){
                container.classList.add('sidebar_button_container_active');
                addonSidebarContainerEl.classList.add('app_sidebar_visible');

                //fake resize to get gmail to fix any heights that are messed up
                fakeWindowResize();
              }
  					}
  				}
        });
			});

		Kefir.fromEvents((document.body:any), 'inboxsdkUpdateSidebarPanel')
			.filter(e => e.detail.sidebarId === this._instanceId)
			.takeUntilBy(this._stopper)
			.onValue(event => {
				const orderedItems = orderManager.getOrderedItems();
				const index = _.findIndex(orderedItems, x => x.value.instanceId === event.detail.instanceId);
				if (index === -1) throw new Error('should not happen: failed to find orderItem');
				orderManager.updateItemValueByIndex(index, {
					id: orderedItems[index].value.id,
          appId: event.detail.appId,
          appName: event.detail.appName || event.detail.title,
					instanceId: event.detail.instanceId,
					title: event.detail.title,
					iconClass: event.detail.iconClass,
					iconUrl: event.detail.iconUrl,
					hideTitleBar: event.detail.hideTitleBar,
					el: event.target
				});
				render();
			});
		Kefir.fromEvents((document.body:any), 'inboxsdkRemoveSidebarPanel')
			.filter(e => e.detail.sidebarId === this._instanceId)
			.takeUntilBy(this._stopper)
			.onValue(event => {
				const orderedItems = orderManager.getOrderedItems();
				const index = _.findIndex(orderedItems, x => x.value.instanceId === event.detail.instanceId);
				if (index === -1) throw new Error('should not happen: failed to find orderItem');
				currentIds.delete(orderedItems[index].id);
				orderManager.removeItemByIndex(index);
				if (orderManager.getOrderedItems().length === 0) {
					this.destroy();
				} else {
					render();
				}

				if(!addonSidebarContainerEl) return;

				iconArea = addonSidebarContainerEl.querySelector('.'+idMap('sidebar_iconArea'));
				if(!iconArea) return;

				const appName = event.detail.appName;

				const container = buttonContainers.get(appName);
				if(container){
					const currentCount = Number(container.getAttribute('data-count'));
          if (currentCount <= 1) {
						const activeButtonContainer = el.querySelector('.sidebar_button_container_active');
						container.remove();
            buttonContainers.delete(appName);
            if(container === activeButtonContainer){
              addonSidebarContainerEl.classList.remove('app_sidebar_visible');
							this._setShouldAppSidebarOpen(false);
            }
					} else if (currentCount === 2) {
						container.removeAttribute('data-count');
					} else {
						container.setAttribute('data-count', String(currentCount-1));
					}
				}
			});

		if(addonSidebarContainerEl){
			// listen for add-on sidebar contents to become visible which can happen in 1 of two cases
			//  1. user clicks on an Add-Icon icon
			//  2. Gmail automatically opens an Add-on sidebar because it was last open in previous thread
			const addonSidebarContentContainerElement = querySelector(addonSidebarContainerEl, ADD_ON_SIDEBAR_CONTENT_SELECTOR);
			makeElementChildStream(addonSidebarContentContainerElement)
				.flatMap(({el, removalStream}) =>
					makeMutationObserverChunkedStream(el, {attributes: true, attributeFilter: ['style']})
						.toProperty(() => null)
						.map(() => el.style.display !== 'none')
						.filter(Boolean)
				)
				.takeUntilBy(this._stopper)
				.onValue(() => {
					// we need to suppress this sidebar from loading
					if(activatedWhileLoading){
						const activeAddOnIcon = addonSidebarContainerEl.querySelector(ACTIVE_ADD_ON_ICON_SELECTOR);
						if(activeAddOnIcon) simulateClick(activeAddOnIcon);
						return;
					}

					this._setShouldAppSidebarOpen(false);

					const activeButtonContainer = iconArea ? iconArea.querySelector('.sidebar_button_container_active') : null;
					if(activeButtonContainer){
						addonSidebarContainerEl.classList.remove('app_sidebar_visible');
						activeButtonContainer.classList.remove('sidebar_button_container_active');
					}
				});
		}
	}

	addSidebarContentPanel(descriptor: Kefir.Observable<Object>) {
		const panel = new ContentPanelViewDriver(this._driver, descriptor, this._instanceId);

		this._stopper
			.takeUntilBy(panel.getStopper())
			.onValue(() => {
				panel.remove();
			});

		return panel;
	}


}

export default defn(module, GmailAppSidebarView);
