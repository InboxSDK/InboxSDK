var _ = require('lodash');
var RSVP = require('rsvp');
var Bacon = require('baconjs');

var makeElementChildStream = require('../../../../lib/dom/make-element-child-stream');
var makeElementViewStream = require('../../../../lib/dom/make-element-view-stream');
var getInsertBeforeElement = require('../../../../lib/dom/get-insert-before-element');

var RouteViewDriver = require('../../../../driver-interfaces/route-view-driver');

var GmailRowListView = require('../gmail-row-list-view');
var GmailThreadView = require('../gmail-thread-view');

var GmailResultsSectionView = require('../gmail-results-section-view');

var GmailElementGetter = require('../../gmail-element-getter');
var GmailRouteNames = require('./gmail-route-names');


var GmailRouteView = function(options){
	RouteViewDriver.call(this);

	this._hash = options.hash;
	this._name = options.name;
	this._params = options.params || [];
	this._isCustomRoute = options.isCustomRoute;

	this._eventStream = new Bacon.Bus();

	if(this._isCustomRoute){
		this._setupCustomViewElement();
	}
	else{
		this._setupSubViews();
	}
};

GmailRouteView.prototype = Object.create(RouteViewDriver.prototype);

_.extend(GmailRouteView.prototype, {

	__memberVariables: [
		{name: '_name', get: true, destroy: false},
		{name: '_params', get: true, destroy: false},
		{name: '_hash', get: true, destroy: false},
		{name: '_isCustomRoute', destroy: true},
		{name: '_customViewElement', destroy: true, get: true},
		{name: '_rowListViews', destroy: true, get: true, defaultValue: []},
		{name: '_threadView', destroy: true, get: true},
		{name: '_eventStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_leftNavHeightObserver', destroy: true, destroyFunction: 'disconnect'}
	],

	isCustomRoute: function(){
		return this._isCustomRoute;
	},

	isSearchResultsView: function(){
		return this._threadView === null && GmailRouteNames.GMAIL_SEARCH_RESULT_ROUTE_NAMES.indexOf(this._name) > -1;
	},

	addResultsSection: function(resultsDescriptor, groupOrderHint){
		var gmailResultsSectionView = new GmailResultsSectionView(resultsDescriptor, groupOrderHint);

		var children = Array.prototype.filter.call(GmailElementGetter.getCurrentMainContentElement().parentElement.children, function(element){
			return !element.classList.contains('nH');
		});

		var insertBeforeElement = getInsertBeforeElement(gmailResultsSectionView.getElement(), children, ['data-group-order-hint', 'data-order-hint']);
		if(insertBeforeElement){
			GmailElementGetter.getCurrentMainContentElement().parentElement.insertBefore(gmailResultsSectionView.getElement(), insertBeforeElement);
		}
		else{
			GmailElementGetter.getCurrentMainContentElement().insertAdjacentElement('beforeBegin', gmailResultsSectionView.getElement());
		}


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
		var self = this;
		RSVP.resolve().then(function(){
			self._setupRowListViews();
			self._setupContentAndSidebarView();
		});
	},

	_setupRowListViews: function(){
		var rowListElements = GmailElementGetter.getRowListElements();

		var self = this;
		Array.prototype.forEach.call(rowListElements, function(rowListElement){
			self._processRowListElement(rowListElement);
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
		var previewPaneRowList = document.querySelector('.aia[gh=tl]');
		if(previewPaneRowList){
			this._startMonitoringPreviewPaneRowListForThread(previewPaneRowList);
			return;
		}


		var threadContainerElement = GmailElementGetter.getThreadContainerElement();
		if(threadContainerElement){
			var gmailThreadView = new GmailThreadView(threadContainerElement, this);

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
			makeElementViewStream({
				elementStream: elementStream,
				viewFn: function(element){
					return new GmailThreadView(element);
				}
			}).doAction(function(view) {
				self._threadView = view;
			}).map(function(view) {
				return {
					eventName: 'newGmailThreadView',
					view: view
				};
			})
		);
	}

});

module.exports = GmailRouteView;
