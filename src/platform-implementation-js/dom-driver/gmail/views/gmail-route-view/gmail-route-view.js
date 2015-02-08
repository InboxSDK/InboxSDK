var _ = require('lodash');
var RSVP = require('rsvp');
var Bacon = require('baconjs');
const asap = require('asap');

var makeElementChildStream = require('../../../../lib/dom/make-element-child-stream');
var makeElementViewStream = require('../../../../lib/dom/make-element-view-stream');
var getInsertBeforeElement = require('../../../../lib/dom/get-insert-before-element');

var RouteViewDriver = require('../../../../driver-interfaces/route-view-driver');

var GmailRowListView = require('../gmail-row-list-view');
var GmailThreadView = require('../gmail-thread-view');

var GmailCollapsibleSectionView = require('../gmail-collapsible-section-view');

var GmailElementGetter = require('../../gmail-element-getter');



var GmailRouteView = function(options, gmailRouteProcessor){
	RouteViewDriver.call(this);

	this._hash = options.hash;
	this._name = options.name;
	this._paramsArray = options.params || [];
	this._isCustomRoute = options.isCustomRoute;

	this._gmailRouteProcessor = gmailRouteProcessor;

	this._eventStream = new Bacon.Bus();

	if(this._isCustomRoute){
		this._setupCustomViewElement();
	}
	else{
		this._setupSubViews();

		if(options.element){
			this._element = options.element;
			this._bindToElementEvents();
		}

	}
};

GmailRouteView.prototype = Object.create(RouteViewDriver.prototype);

_.extend(GmailRouteView.prototype, {

	__memberVariables: [
		{name: '_name', destroy: false},
		{name: '_paramsArray', destroy: false},
		{name: '_hash', get: true, destroy: false},
		{name: '_isCustomRoute', destroy: true},
		{name: '_customViewElement', destroy: true, get: true},
		{name: '_rowListViews', destroy: true, get: true, defaultValue: []},
		{name: '_threadView', destroy: true, get: true},
		{name: '_sectionsContainer', destroy: false},
		{name: '_eventStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_leftNavHeightObserver', destroy: true, destroyFunction: 'disconnect'},
		{name: '_pageCommunicator', destroy: false, set: true},
		{name: '_gmailRouteProcessor', destroy: false},
		{name: '_threadContainerElement', destroy: false},
		{name: '_rowListElements', destroy: false},
		{name: '_element', destroy: false}
	],

	isCustomRoute: function(){
		return this._isCustomRoute;
	},

	doesMatchRouteID: function(routeID){
		if(!routeID){
			return false;
		}

		if(!this._gmailRouteProcessor){
			return false;
		}

		if(this._isCustomRoute){
			return this._doesMatchCustomRouteID(routeID);
		}
		else{
			var nativeParams = this.getParams(routeID);
			var extractedParamKeys = this._extractParamKeysFromRouteID(routeID);

			var paramKeys = Object.keys(nativeParams);
			return _.isEqual(paramKeys.sort(), extractedParamKeys.sort());
		}
	},

	getRouteID: function(){
		return this._getRouteID();
	},

	getRouteType: function(){
		return this._getRouteType();
	},

	getParams: function(routeID){
		if(this._isCustomRoute){
			return this._getCustomParams(routeID);
		}

		var params = this._getNativeParams() || {};
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

	addCollapsibleSection: function(collapsibleSectionDescriptorProperty, groupOrderHint){
		var gmailResultsSectionView = new GmailCollapsibleSectionView(groupOrderHint, this._getRouteID() === this._gmailRouteProcessor.NativeRouteIDs.SEARCH);

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
			if (!this._eventStream) {
				return;
			}
			this._setupRowListViews();
			this._setupContentAndSidebarView();
		});
	},

	_setupRowListViews: function(){
		this._rowListElements = GmailElementGetter.getRowListElements();

		Array.prototype.forEach.call(this._rowListElements, (rowListElement) => {
			this._processRowListElement(rowListElement);
		});
	},

	_processRowListElement: function(rowListElement){
		var rootElement = rowListElement.parentElement;
		var gmailRowListView = new GmailRowListView(rootElement, this);

		this._rowListViews.push(gmailRowListView);

		this._eventStream.push({
			eventName: 'newGmailRowListView',
			view: gmailRowListView
		});

		this._eventStream.plug(gmailRowListView.getEventStream().filter(function(event) {
			return event.eventName === 'newGmailThreadRowView';
		}));
	},


	_setupContentAndSidebarView: function(){
		this._rowListElements = document.querySelector('.aia[gh=tl]');
		if(this._rowListElements){
			this._startMonitoringPreviewPaneRowListForThread(this._rowListElements);
			return;
		}


		this._threadContainerElement = GmailElementGetter.getThreadContainerElement();
		if(this._threadContainerElement){
			var gmailThreadView = new GmailThreadView(this._threadContainerElement, this);

			this._threadView = gmailThreadView;

			this._eventStream.push({
				eventName: 'newGmailThreadView',
				view: gmailThreadView
			});
		}

	},

	_startMonitoringPreviewPaneRowListForThread: function(rowListElement){
		var threadContainerTableElement = rowListElement.querySelector('table.Bs > tr');

		var elementStream = makeElementChildStream(threadContainerTableElement)
			.filter(function(event) {
				return !!event.el.querySelector('.if');
			});

		var self = this;
		this._eventStream.plug(
			elementStream.flatMap(makeElementViewStream(function(element){
				return new GmailThreadView(element);
			})).doAction(function(view) {
				self._threadView = view;
			}).map(function(view) {
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

	_getCustomParams: function(routeID){
		var params = {};

		if(this._paramsArray.length === 0 || !routeID){
			return params;
		}

		var paramsArray = this._paramsArray;
		routeID
			.split('/')
			.forEach(function(part, index){
				if(part.indexOf(':') !== 0){
					return;
				}
				part = part.substring(1);

				if(paramsArray[index]){
					params[part] = paramsArray[index];
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
		return this._getRouteID() === this._gmailRouteProcessor.NativeRouteIDs.SEARCH;
	},

	_getRouteType: function(){
		if(this._isCustomRoute){
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
		if(this._threadContainerElement){
			return true;
		}

		if(!this._gmailRouteProcessor.isListRouteName(this._name)){
			return false;
		}

		if(this._rowListElements && this._rowListElements.length > 0){
			return false;
		}

		this._threadContainerElement = GmailElementGetter.getThreadContainerElement();
		return !!this._threadContainerElement;
	},

	_isListRoute: function(){
		if(this._rowListElements && this._rowListElements.length > 0){
			return true;
		}

		if(!this._gmailRouteProcessor.isListRouteName(this._name)){
			return false;
		}

		if(this._rowListElements){
			return false;
		}

		this._rowListElements = GmailElementGetter.getRowListElements();
		return this._rowListElements.length > 0;
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

		if(this._getRouteID() === this._gmailRouteProcessor.NativeRouteIDs.LABEL){
			if(this._paramsArray[0] && this._paramsArray[0].indexOf('p') === -1){
				params.labelName = this._paramsArray[0];
			}
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

		return {
			threadID: this._pageCommunicator.getCurrentThreadID(this._threadContainerElement)
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

	_getRouteID: function(){
		if(this._isCustomRoute){
			return null;
		}
		else{
			if(this._isThreadRoute()){
				return this._gmailRouteProcessor.NativeRouteIDs.THREAD;
			}
			else{
				return this._gmailRouteProcessor.getRouteID(this._name);
			}
		}
	},

	_extractParamKeysFromRouteID: function(routeID){
		return routeID.split('/').filter(function(part){
			return part.indexOf(':') === 0;
		}).map(function(part){
			return part.substring(1);
		});
	},

	_doesMatchCustomRouteID: function(routeID){
		if(!this._paramsArray){
			return false;
		}

		var parts = routeID.split('/');
		if(parts.length !== this._paramsArray.length){
			return false;
		}

		for(var ii=0; ii<parts.length; ii++){
			var part = parts[ii];
			if(part.indexOf(':') === -1){
				if(this._paramsArray[ii] !== part){
					return false;
				}
			}
		}

		return true;
	},

	_bindToElementEvents: function(){
		this._element.addEventListener('nowMain', (event) => {
			if(this._sectionsContainer){
				this._sectionsContainer.style.display = '';
			}
		});

		this._element.addEventListener('nowNotMain', (event) => {
			if(this._sectionsContainer){
				this._sectionsContainer.style.display = 'none';
			}
		});

		this._element.addEventListener('removed', (event) => {
			this.destroy();
		});
	}

});

module.exports = GmailRouteView;
