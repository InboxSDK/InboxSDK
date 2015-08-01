'use strict';

var _ = require('lodash');
var RSVP = require('rsvp');
var Bacon = require('baconjs');
var kefirStopper = require('kefir-stopper');
const asap = require('asap');

var makeElementChildStream = require('../../../../lib/dom/make-element-child-stream');
var makeElementViewStream = require('../../../../lib/dom/make-element-view-stream');
var getInsertBeforeElement = require('../../../../lib/dom/get-insert-before-element');
var RouteViewDriver = require('../../../../driver-interfaces/route-view-driver');
var GmailRowListView = require('../gmail-row-list-view');
var GmailThreadView = require('../gmail-thread-view');
var GmailCollapsibleSectionView = require('../gmail-collapsible-section-view');
var GmailElementGetter = require('../../gmail-element-getter');

import assertInterface from '../../../../lib/assert-interface';
import addAccessors from 'add-accessors';
import simulateClick from '../../../../lib/dom/simulate-click';

function GmailRouteView({urlObject, type, routeID}, gmailRouteProcessor, driver) {
	this._type = type;
	this._hash = urlObject.hash;
	this._name = urlObject.name;
	this._paramsArray = urlObject.params;
	this._customRouteID = routeID;

	this._stopper = kefirStopper();
	this._rowListViews = [];

	this._gmailRouteProcessor = gmailRouteProcessor;
	this._driver = driver;

	this._eventStream = new Bacon.Bus();

	if (this._type === 'CUSTOM') {
		this._setupCustomViewElement();
		driver.getStopper().takeUntilBy(this._stopper.delay(0)).onValue(() => {
			driver.showNativeRouteView();
			window.location.hash = '#inbox';
		});
	} else if (_.includes(['NATIVE', 'CUSTOM_LIST'], this._type)) {
		this._setupSubViews();
	}
}

addAccessors(GmailRouteView.prototype, [
	{name: '_name', destroy: false},
	{name: '_paramsArray', destroy: false},
	{name: '_hash', get: true, destroy: false},
	{name: '_type', get: true, destroy: false},
	{name: '_customRouteID', destroy: false},
	{name: '_stopper', destroy: true},
	{name: '_customViewElement', destroy: true, get: true, destroyMethod: 'remove'},
	{name: '_rowListViews', destroy: true, get: true},
	{name: '_threadView', destroy: true, get: true},
	{name: '_sectionsContainer', destroy: false},
	{name: '_eventStream', destroy: true, get: true, destroyMethod: 'end'},
	{name: '_leftNavHeightObserver', destroy: true, destroyMethod: 'disconnect'},
	{name: '_pageCommunicator', destroy: false, set: true},
	{name: '_gmailRouteProcessor', destroy: false},
	{name: '_driver', destroy: false}
]);

_.extend(GmailRouteView.prototype, {

	getType: function() {
		if (this._type === 'OTHER_APP_CUSTOM') {
			return 'CUSTOM';
		} else {
			return this._type;
		}
	},

	getParams: function(){
		if (this._customRouteID) {
			return this._getCustomParams();
		}

		var params = this._getNativeParams() || {};
		const routeID = this.getRouteID();
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
	},

	addCollapsibleSection: function(sectionDescriptorProperty, groupOrderHint){
		return this._addCollapsibleSection(sectionDescriptorProperty, groupOrderHint, true);
	},

	addSection: function(sectionDescriptorProperty, groupOrderHint){
		return this._addCollapsibleSection(sectionDescriptorProperty, groupOrderHint, false);
	},

	_addCollapsibleSection: function(collapsibleSectionDescriptorProperty, groupOrderHint, isCollapsible){
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
	},

	_setupCustomViewElement: function(){
		this._customViewElement = document.createElement('div');
		this._customViewElement.classList.add('inboxsdk__custom_view_element');

		this._monitorLeftNavHeight();
		this._setCustomViewElementHeight();
	},

	_monitorLeftNavHeight: function(){
		var leftNav = GmailElementGetter.getLeftNavContainerElement();

		if(!leftNav){
			return;
		}

		this._leftNavHeightObserver = new MutationObserver(this._setCustomViewElementHeight.bind(this));
		this._leftNavHeightObserver.observe(
			leftNav,
			{attributes: true, attributeFilter: ['style']}
		);
	},

	_setCustomViewElementHeight: function(){
		var leftNav = GmailElementGetter.getLeftNavContainerElement();
		this._customViewElement.style.height = leftNav.style.height;
	},

	_setupSubViews: function(){
		asap(() => {
			if (!this._eventStream) return;

			this._setupRowListViews();
			this._setupContentAndSidebarView();
		});
	},

	_setupRowListViews: function(){
		const rowListElements = GmailElementGetter.getRowListElements();

		Array.prototype.forEach.call(rowListElements, (rowListElement) => {
			this._processRowListElement(rowListElement);
		});
	},

	_processRowListElement: function(rowListElement){
		const rootElement = rowListElement.parentElement;
		const gmailRowListView = new GmailRowListView(rootElement, this, this._driver);

		this._rowListViews.push(gmailRowListView);

		this._eventStream.push({
			eventName: 'newGmailRowListView',
			view: gmailRowListView
		});
	},

	_setupContentAndSidebarView: function(){
		const rowListElements = document.querySelector('.aia[gh=tl]');

		if(rowListElements){
			this._startMonitoringPreviewPaneRowListForThread(rowListElements);
			return;
		}

		const threadContainerElement = GmailElementGetter.getThreadContainerElement();

		if(threadContainerElement){
			var gmailThreadView = new GmailThreadView(threadContainerElement, this, this._driver);

			this._threadView = gmailThreadView;

			this._eventStream.push({
				eventName: 'newGmailThreadView',
				view: gmailThreadView
			});
		}
	},

	_startMonitoringPreviewPaneRowListForThread: function(rowListElement){
		const threadContainerTableElement = rowListElement.querySelector('table.Bs > tr');

		const elementStream = makeElementChildStream(threadContainerTableElement)
			.filter(function(event) {
				return !!event.el.querySelector('.if');
			});

		this._eventStream.plug(
			elementStream.flatMap(makeElementViewStream((element) => {
				return new GmailThreadView(element, this, this._driver, true);
			})).doAction((view) => {
				this._threadView = view;
			}).map((view) => {
				return {
					eventName: 'newGmailThreadView',
					view: view
				};
			})
		);
	},

	_getSectionsContainer: function(){
		var sectionsContainer = GmailElementGetter.getMainContentContainer().querySelector('.inboxsdk__custom_sections');
		if(!sectionsContainer){
			this._sectionsContainer = document.createElement('div');
			this._sectionsContainer.classList.add('inboxsdk__custom_sections');

			if(this._isSearchRoute()){
				this._sectionsContainer.classList.add('Wc');
			}

			GmailElementGetter.getMainContentContainer().insertBefore(this._sectionsContainer, GmailElementGetter.getMainContentContainer().firstChild);
			sectionsContainer = this._sectionsContainer;
		}
		else if(!sectionsContainer.classList.contains('Wc') && this._isSearchRoute()){
			sectionsContainer.classList.add('Wc');
		}
		else if(sectionsContainer.classList.contains('Wc') && !this._isSearchRoute()){
			sectionsContainer.classList.remove('Wc');
		}

		return sectionsContainer;
	},

	_getCustomParams: function() {
		const params = {};

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
	},

	_getNativeParams: function(){
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
	},

	_isSearchRoute: function(){
		return this.getRouteID() === this._gmailRouteProcessor.NativeRouteIDs.SEARCH;
	},

	getRouteType: function(){
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
	},

	_isThreadRoute: function(){
		return !!GmailElementGetter.getThreadContainerElement();
	},

	_isListRoute: function(){
		const rowListElements = GmailElementGetter.getRowListElements();

		return (
					this._type === 'CUSTOM_LIST' ||
					this._gmailRouteProcessor.isListRouteName(this._name)
				) &&
				rowListElements &&
				rowListElements.length > 0;
	},

	_isSettingsRoute: function(){
		return this._gmailRouteProcessor.isSettingsRouteName(this._name);
	},

	_getSearchRouteParams: function(){
		return {
			query: this._paramsArray[0],
			includesDriveResults: this._name === 'apps',
			page: this._getPageParam()
		};
	},

	_getListRouteParams: function(){
		var params = {
			page: this._getPageParam()
		};

		if(
			this.getRouteID() === this._gmailRouteProcessor.NativeRouteIDs.LABEL &&
			this._paramsArray[0]
		) {
			params.labelName = this._paramsArray[0];
		}

		return params;
	},

	_getThreadRouteParams: function(){
		if(this._paramsArray && this._paramsArray.length > 0){
			var threadID = _.last(this._paramsArray);

			if(threadID && threadID.length === 16){
				return {
					threadID: threadID
				};
			}
		}

		const threadContainerElement = GmailElementGetter.getThreadContainerElement();

		return {
			threadID: threadContainerElement ? this._pageCommunicator.getCurrentThreadID(threadContainerElement) : ''
		};
	},

	_getSettingsRouteParams: function(){
		return {
			tabName: this._paramsArray[0]
		};
	},

	_getPageParam: function(){
		for(var ii=1; ii<this._paramsArray.length; ii++){
			if(this._paramsArray[ii].match(/p\d+/)){
				return parseInt(this._paramsArray[ii].replace(/[a-zA-Z]/, ''), 10);
			}
		}

		return 1;
	},

	getRouteID: function(){
		if (this._customRouteID) {
			return this._customRouteID;
		} else if(this._isThreadRoute()) {
			return this._gmailRouteProcessor.NativeRouteIDs.THREAD;
		} else {
			return this._gmailRouteProcessor.getRouteID(this._name);
		}
	},

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
	},

	_extractParamKeysFromRouteID: function(routeID){
		return routeID.split('/')
			.filter(part => part[0] === ':')
			.map(part => part.substring(1));
	}

});

assertInterface(GmailRouteView.prototype, RouteViewDriver);

module.exports = GmailRouteView;
