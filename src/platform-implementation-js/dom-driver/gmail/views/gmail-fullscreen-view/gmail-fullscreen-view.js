var _ = require('lodash');
var Bacon = require('baconjs');

var ElementMonitor = require('../../../../lib/dom/element-monitor');

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
		return;
	}

	this._setupSubViews();
};

GmailFullscreenView.prototype = Object.create(FullscreenViewDriver.prototype);

_.extend(GmailFullscreenView.prototype, {

	__memberVariables: [
		{name: '_name', get: true, destroy: false},
		{name: '_params', get: true, destroy: false},
		{name: '_hash', get: true, destroy: false},
		{name: '_isCustomView', destroy: true},
		{name: '_rowListViews', destroy: true, get: true, defaultValue: []},
		{name: '_threadView', destroy: true, get: true},
		{name: '_eventStreamBus', destroy: true, destroyFunction: 'end'}
	],

	isCustomView: function(){
		return this._isCustomView;
	},

	getEventStream: function(){
		return this._eventStreamBus;
	},

	_setupSubViews: function(){
		var self = this;
		setTimeout(function(){
			self._setupRowListViews();
			self._setupThreadView();
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
		var gmailRowListView = new GmailRowListView(rootElement);

		this._rowListViews.push(gmailRowListView);

		this._eventStreamBus.push({
			eventName: 'newGmailRowListView',
			view: gmailRowListView
		});
	},


	_setupThreadView: function(){
		var previewPaneRowList = document.querySelector('.aia[gh=tl]');
		if(previewPaneRowList){
			this._startMonitoringPreviewPaneRowListForThread(previewPaneRowList);
			return;
		}


		var threadContainerElement = GmailElementGetter.getThreadContainerElement();
		if(threadContainerElement){
			var gmailThreadView = new GmailThreadView(threadContainerElement);

			this._threadView = gmailThreadView;

			this._eventStreamBus.push({
				eventName: 'newGmailThreadView',
				view: gmailThreadView
			});
		}
	},

	_startMonitoringPreviewPaneRowListForThread: function(rowListElement){
		var threadContainerTableElement = rowListElement.querySelector('table.Bs > tr');
		var elementMonitor = new ElementMonitor({

			elementMembershipTest: function(element){
				if(!element.querySelector('.if')){
					return false;
				}

				return true;
			},

			viewCreationFunction: function(element){
				return new GmailThreadView(element);
			}

		});


		var self = this;
		elementMonitor.getViewAddedEventStream().onValue(function(view){
			self._threadView = view;

			self._eventStreamBus.push({
				eventName: 'newGmailThreadView',
				view: view
			});
		});

		elementMonitor.setObservedElement(threadContainerTableElement);

	}

});

module.exports = GmailFullscreenView;
