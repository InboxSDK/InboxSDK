var _ = require('lodash');
var Bacon = require('baconjs');

var makeElementChildStream = require('../../../../lib/dom/make-element-child-stream');
var makeElementViewStream = require('../../../../lib/dom/make-element-view-stream');

var FullscreenViewDriver = require('../../../../driver-interfaces/fullscreen-view-driver');

var GmailRowListView = require('../gmail-row-list-view');
var GmailThreadView = require('../gmail-thread-view');


var GmailElementGetter = require('../../gmail-element-getter');

var GmailFullscreenView = function(options){
	FullscreenViewDriver.call(this);

	this._hash = options.hash;
	this._name = options.name;
	this._params = options.params;
	this._isCustomView = options.isCustomView;

	this._eventStreamBus = new Bacon.Bus();

	if(this._isCustomView){
		this._setupCustomViewElement();
	}
	else{
		this._setupSubViews();
	}
};

GmailFullscreenView.prototype = Object.create(FullscreenViewDriver.prototype);

_.extend(GmailFullscreenView.prototype, {

	__memberVariables: [
		{name: '_name', get: true, destroy: false},
		{name: '_params', get: true, destroy: false},
		{name: '_hash', get: true, destroy: false},
		{name: '_isCustomView', destroy: true},
		{name: '_customViewElement', destroy: true, get: true},
		{name: '_rowListViews', destroy: true, get: true, defaultValue: []},
		{name: '_threadView', destroy: true, get: true},
		{name: '_messageView', destroy: true, get: true},
		{name: '_threadSidebarView', destroy: true, get: true},
		{name: '_messageSidebarView', destroy: true, get: true},
		{name: '_eventStreamBus', destroy: true, destroyFunction: 'end'}
	],

	isCustomView: function(){
		return this._isCustomView;
	},

	getEventStream: function(){
		return this._eventStreamBus;
	},

	_setupCustomViewElement: function(){
		this._customViewElement = document.createElement('div');
		this._customViewElement.classList.add('inboxsdk__custom_view_element');
	},

	_setupSubViews: function(){
		var self = this;
		setTimeout(function(){
			self._setupRowListViews();
			self._setupContentAndSidebarView();
		}, 1);
	},

	_setupRowListViews: function(){
		var rowListElements = GmailElementGetter.getRowListElements();
		if(rowListElements.length === 0){
			return;
		}

		var self = this;
		Array.prototype.forEach.call(rowListElements, function(rowListElement){
			self._processRowListElement(rowListElement);
		});
	},

	_processRowListElement: function(rowListElement){
		var rootElement = rowListElement.parentElement;
		var gmailRowListView = new GmailRowListView(rootElement, this);

		this._rowListViews.push(gmailRowListView);

		this._eventStreamBus.push({
			eventName: 'newGmailRowListView',
			view: gmailRowListView
		});
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

			this._eventStreamBus.push({
				eventName: 'newGmailThreadView',
				view: gmailThreadView
			});
		}

	},

	_startMonitoringPreviewPaneRowListForThread: function(rowListElement){
		var threadContainerTableElement = rowListElement.querySelector('table.Bs > tr');

		var elementStream = makeElementChildStream(threadContainerTableElement)
			.takeUntil(this._eventStreamBus.filter(false).mapEnd())
			.filter(function(event) {
				return !!event.el.querySelector('.if');
			});

		var self = this;
		this._eventStreamBus.plug(
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

module.exports = GmailFullscreenView;
