/* @flow */
//jshint ignore:start

import _ from 'lodash';
import RSVP from 'rsvp';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import kefirBus from 'kefir-bus';

import asap from 'asap';
import {defn} from 'ud';

import makeElementChildStream from '../../../../lib/dom/make-element-child-stream';
import makeElementViewStream from '../../../../lib/dom/make-element-view-stream';
import makeMutationObserverChunkedStream from '../../../../lib/dom/make-mutation-observer-chunked-stream';
import getInsertBeforeElement from '../../../../lib/dom/get-insert-before-element';
import type {RouteViewDriver} from '../../../../driver-interfaces/route-view-driver';
import GmailRowListView from '../gmail-row-list-view';
import GmailThreadView from '../gmail-thread-view';
import GmailCollapsibleSectionView from '../gmail-collapsible-section-view';
import GmailElementGetter from '../../gmail-element-getter';

import assertInterface from '../../../../lib/assert-interface';
import simulateClick from '../../../../lib/dom/simulate-click';

import type GmailDriver from '../../gmail-driver';
import type GmailRouteProcessor from '../gmail-route-view/gmail-route-processor';
import type GmailPageCommunicator from '../../gmail-page-communicator';

var GmailRouteView = defn(module, class GmailRouteView {
	_type: string;
	_hash: string;
	_name: string;
	_paramsArray: string[];
	_customRouteID: ?string;
	_stopper: Kefir.Stream<null>&{destroy():void};
	_rowListViews: GmailRowListView[];
	_gmailRouteProcessor: GmailRouteProcessor;
	_driver: GmailDriver;
	_eventStream: Kefir.Bus<any>;
	_customViewElement: ?HTMLElement;
	_threadView: ?GmailThreadView;
	_sectionsContainer: ?HTMLElement;
	_pageCommunicator: ?GmailPageCommunicator;

	constructor({urlObject, type, routeID}: Object, gmailRouteProcessor: GmailRouteProcessor, driver: GmailDriver) {
		this._type = type;
		this._hash = urlObject.hash;
		this._name = urlObject.name;
		this._paramsArray = urlObject.params;
		this._customRouteID = routeID;

		this._stopper = kefirStopper();
		this._rowListViews = [];

		this._gmailRouteProcessor = gmailRouteProcessor;
		this._driver = driver;

		this._eventStream = kefirBus();

		if (this._type === 'CUSTOM') {
			this._setupCustomViewElement();
			driver.getStopper().takeUntilBy(this._stopper.delay(0)).onValue(() => {
				driver.showNativeRouteView();
				window.location.hash = '#inbox';
			});
		} else if (_.includes(['NATIVE', 'CUSTOM_LIST'], this._type)) {
			this._setupSubViews();
		}

		if (this._type === 'CUSTOM_LIST') {
			Kefir.later(500)
				.takeUntilBy(this._stopper)
				.onValue(() => {
					var last = driver.getLastCustomThreadListActivity();
					if (!last || last.customRouteID !== this._customRouteID || Date.now()-last.timestamp > 5000) {
						this.refresh();
					}
				});
		}
	}

	destroy() {
		this._stopper.destroy();
		this._eventStream.end();
		if (this._customViewElement) {
			this._customViewElement.remove();
		}
		var rowListViews = this._rowListViews;
		this._rowListViews = [];
		rowListViews.forEach(view => {
			view.destroy();
		});
		if (this._threadView) {
			this._threadView.destroy();
			this._threadView = null;
		}
	}

	getHash(): string {return this._hash;}
	getEventStream(): Kefir.Stream<Object> {return this._eventStream;}
	getStopper(): Kefir.Stream<null> {return this._stopper;}
	getCustomViewElement(): ?HTMLElement {return this._customViewElement;}
	getRowListViews(): GmailRowListView[] {return this._rowListViews;}
	getThreadView(): ?GmailThreadView {return this._threadView;}

	setPageCommunicator(pc: GmailPageCommunicator) {
		this._pageCommunicator = pc;
	}

	getType(): string {
		if (this._type === 'OTHER_APP_CUSTOM') {
			return 'CUSTOM';
		} else {
			return this._type;
		}
	}

	isCustomRouteBelongingToApp(): boolean {
		return this._type === 'CUSTOM';
	}

	getParams(): {[ix:string]: string} {
		if (this._customRouteID) {
			return this._getCustomParams();
		}

		var params = this._getNativeParams();
		var routeID = this.getRouteID();
		if(!routeID){
			return params;
		}

		var routeIDParams = this._extractParamKeysFromRouteID(routeID);
		var routeParams = {};
		routeIDParams.forEach(function(param){
			if(params[param]){
				routeParams[param] = params[param];
			}
		});

		return routeParams;
	}

	addCollapsibleSection(sectionDescriptorProperty: Kefir.Stream<?Object>, groupOrderHint: any): GmailCollapsibleSectionView {
		return this._addCollapsibleSection(sectionDescriptorProperty, groupOrderHint, true);
	}

	addSection(sectionDescriptorProperty: Kefir.Stream<?Object>, groupOrderHint: any): GmailCollapsibleSectionView {
		return this._addCollapsibleSection(sectionDescriptorProperty, groupOrderHint, false);
	}

	_addCollapsibleSection(collapsibleSectionDescriptorProperty: Object, groupOrderHint: any, isCollapsible: boolean): GmailCollapsibleSectionView {
		var gmailResultsSectionView = new GmailCollapsibleSectionView(groupOrderHint, this.getRouteID() === this._gmailRouteProcessor.NativeRouteIDs.SEARCH, isCollapsible);

		var sectionsContainer = this._getSectionsContainer();
		gmailResultsSectionView
			.getEventStream()
			.filter(function(event){
				return event.type === 'update' && event.property === 'orderHint';
			})
			.onValue(function(){
				var children = sectionsContainer.children;
				var insertBeforeElement = getInsertBeforeElement(gmailResultsSectionView.getElement(), children, ['data-group-order-hint', 'data-order-hint']);
				if(insertBeforeElement){
					sectionsContainer.insertBefore(gmailResultsSectionView.getElement(), insertBeforeElement);
				}
				else{
					sectionsContainer.appendChild(gmailResultsSectionView.getElement());
				}
			});

		gmailResultsSectionView.setCollapsibleSectionDescriptorProperty(collapsibleSectionDescriptorProperty);

		return gmailResultsSectionView;
	}

	_setupCustomViewElement(){
		this._customViewElement = document.createElement('div');
		this._customViewElement.classList.add('inboxsdk__custom_view_element');

		this._monitorLeftNavHeight();
		this._setCustomViewElementHeight();
	}

	_monitorLeftNavHeight(){
		var leftNav = GmailElementGetter.getLeftNavContainerElement();

		if(!leftNav){
			return;
		}

		makeMutationObserverChunkedStream(leftNav, {attributes: true, attributeFilter: ['style']})
			.takeUntilBy(this._stopper)
			.onValue(() => {
				this._setCustomViewElementHeight();
			});
	}

	_setCustomViewElementHeight(){
		var leftNav = GmailElementGetter.getLeftNavContainerElement();
		var gtalkButtons = GmailElementGetter.getGtalkButtons();
		var customViewEl = this._customViewElement;
		if (!customViewEl) throw new Error("Should not happen");
		customViewEl.style.height = `${parseInt(leftNav.style.height,10) + (gtalkButtons ? gtalkButtons.offsetHeight : 0)}px`;
	}

	_setupSubViews(){
		asap(() => {
			if (!this._eventStream) return;

			this._setupRowListViews();
			this._setupContentAndSidebarView();
		});
	}

	_setupRowListViews(){
		var rowListElements = GmailElementGetter.getRowListElements();

		Array.prototype.forEach.call(rowListElements, (rowListElement) => {
			this._processRowListElement(rowListElement);
		});
	}

	_processRowListElement(rowListElement: HTMLElement){
		var rootElement = rowListElement.parentElement;
		if(!rootElement) throw new Error('no rootElement');
		var gmailRowListView = new GmailRowListView((rootElement: any), this, this._driver);

		this._rowListViews.push(gmailRowListView);

		this._eventStream.emit({
			eventName: 'newGmailRowListView',
			view: gmailRowListView
		});
	}

	_setupContentAndSidebarView(){
		var rowListElements = document.querySelector('.aia[gh=tl]');

		if(rowListElements){
			this._startMonitoringPreviewPaneRowListForThread(rowListElements);
			return;
		}

		var threadContainerElement = GmailElementGetter.getThreadContainerElement();

		if(threadContainerElement){
			var gmailThreadView = new GmailThreadView(threadContainerElement, this, this._driver);

			this._threadView = gmailThreadView;

			this._eventStream.emit({
				eventName: 'newGmailThreadView',
				view: gmailThreadView
			});
		}
	}

	_startMonitoringPreviewPaneRowListForThread(rowListElement: HTMLElement){
		var threadContainerTableElement = rowListElement.querySelector('table.Bs > tr');

		var elementStream = makeElementChildStream(threadContainerTableElement)
			.filter(function(event) {
				return !!event.el.querySelector('.if');
			});

		this._eventStream.plug(
			elementStream.flatMap(makeElementViewStream((element) => {
				return new (GmailThreadView:any)(element, this, this._driver, true);
			})).map((view) => {
				this._threadView = view;
				return {
					eventName: 'newGmailThreadView',
					view: view
				};
			})
		);
	}

	_getSectionsContainer(): HTMLElement {
		var sectionsContainer = GmailElementGetter.getMainContentContainer().querySelector('.inboxsdk__custom_sections');
		if(!sectionsContainer){
			sectionsContainer = this._sectionsContainer = document.createElement('div');
			sectionsContainer.classList.add('inboxsdk__custom_sections');

			if(this._isSearchRoute()){
				sectionsContainer.classList.add('Wc');
			}

			GmailElementGetter.getMainContentContainer().insertBefore(sectionsContainer, GmailElementGetter.getMainContentContainer().firstChild);
		}
		else if(!sectionsContainer.classList.contains('Wc') && this._isSearchRoute()){
			sectionsContainer.classList.add('Wc');
		}
		else if(sectionsContainer.classList.contains('Wc') && !this._isSearchRoute()){
			sectionsContainer.classList.remove('Wc');
		}

		return sectionsContainer;
	}

	_getCustomParams(): Object {
		var params: Object = {};

		if (!this._customRouteID) throw new Error("Should not happen, can't get custom params for non-custom view");
		this._customRouteID
			.split('/')
			.slice(1)
			.forEach((part, index) => {
				if(part[0] !== ':') {
					return;
				}
				part = part.substring(1);

				if(this._paramsArray[index]) {
					params[part] = this._paramsArray[index];
				}
			});

		return params;
	}

	_getNativeParams(): Object {
		if(this._isSearchRoute()){
			return this._getSearchRouteParams();
		}
		else if(this._isListRoute()){
			return this._getListRouteParams();
		}
		else if(this._isThreadRoute()){
			return this._getThreadRouteParams();
		}
		else if(this._isSettingsRoute()){
			return this._getSettingsRouteParams();
		}
		return {};
	}

	_isSearchRoute(): boolean {
		return this.getRouteID() === this._gmailRouteProcessor.NativeRouteIDs.SEARCH;
	}

	getRouteType(): string {
		if(_.includes(['CUSTOM', 'OTHER_APP_CUSTOM'], this._type)) {
			return this._gmailRouteProcessor.RouteTypes.CUSTOM;
		}
		else if(this._isListRoute()){
			return this._gmailRouteProcessor.RouteTypes.LIST;
		}
		else if(this._isThreadRoute()){
			return this._gmailRouteProcessor.RouteTypes.THREAD;
		}
		else if(this._isSettingsRoute()){
			return this._gmailRouteProcessor.RouteTypes.SETTINGS;
		}

		return this._gmailRouteProcessor.RouteTypes.UNKNOWN;
	}

	_isThreadRoute(): boolean {
		return !!GmailElementGetter.getThreadContainerElement();
	}

	_isListRoute(): boolean {
		var rowListElements = GmailElementGetter.getRowListElements();

		return (
					this._type === 'CUSTOM_LIST' ||
					this._gmailRouteProcessor.isListRouteName(this._name)
				) &&
				rowListElements &&
				rowListElements.length > 0;
	}

	_isSettingsRoute(): boolean {
		return this._gmailRouteProcessor.isSettingsRouteName(this._name);
	}

	_getSearchRouteParams(): Object {
		return {
			query: this._paramsArray[0],
			includesDriveResults: this._name === 'apps',
			page: this._getPageParam()
		};
	}

	_getListRouteParams(): Object {
		var params: Object = {
			page: this._getPageParam()
		};

		if(
			this.getRouteID() === this._gmailRouteProcessor.NativeRouteIDs.LABEL &&
			this._paramsArray[0]
		) {
			params.labelName = this._paramsArray[0];
		}

		return params;
	}

	_getThreadRouteParams(): Object {
		if(this._paramsArray && this._paramsArray.length > 0){
			var threadID = _.last(this._paramsArray);

			if(threadID && threadID.length === 16){
				return {
					threadID: threadID
				};
			}
		}

		var threadContainerElement = GmailElementGetter.getThreadContainerElement();

		if (!this._pageCommunicator) throw new Error("Missing page communicator");
		return {
			threadID: threadContainerElement ? this._pageCommunicator.getCurrentThreadID(threadContainerElement) : ''
		};
	}

	_getSettingsRouteParams(): Object {
		return {
			tabName: this._paramsArray[0]
		};
	}

	_getPageParam(): number {
		for(var ii=1; ii<this._paramsArray.length; ii++){
			if(this._paramsArray[ii].match(/p\d+/)){
				return parseInt(this._paramsArray[ii].replace(/[a-zA-Z]/, ''), 10);
			}
		}

		return 1;
	}

	getRouteID(): string {
		if (this._customRouteID) {
			return this._customRouteID;
		} else if(this._isThreadRoute()) {
			return this._gmailRouteProcessor.NativeRouteIDs.THREAD;
		} else {
			return this._gmailRouteProcessor.getRouteID(this._name);
		}
	}

	// Used to click gmail refresh button in thread lists
	refresh() {
		var el = GmailElementGetter.getToolbarElement().querySelector('div.T-I.nu');
		if (el) {
			var prevActive = document.activeElement;
			var prevClassName = el.className;
			simulateClick(el);
			el.className = prevClassName; // remove the gmail focus class
			if (prevActive) {
				prevActive.focus();
			} else {
				el.blur();
			}
		}
	}

	_extractParamKeysFromRouteID(routeID: string): string[] {
		return routeID.split('/')
			.filter(part => part[0] === ':')
			.map(part => part.substring(1));
	}
});
export default GmailRouteView;

// This function does not get executed. It's only checked by Flow to make sure
// this class successfully implements the type interface.
function __interfaceCheck() {
	var x: RouteViewDriver = new GmailRouteView(({}:any), ({}:any), ({}:any));
}
