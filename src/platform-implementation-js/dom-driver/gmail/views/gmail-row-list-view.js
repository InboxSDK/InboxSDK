var _ = require('lodash');
var $ = require('jquery');

var Bacon = require('baconjs');

var RowListViewDriver = require('../../../driver-interfaces/row-list-view-driver');

var GmailToolbarView = require('./gmail-toolbar-view');
var GmailThreadRowView = require('./gmail-thread-row-view');

var waitFor = require('../../../lib/wait-for');
var makeElementChildStream = require('../../../lib/dom/make-element-child-stream');
var makeElementViewStream = require('../../../lib/dom/make-element-view-stream');

var GmailRowListView = function(rootElement, fullscreenViewDriver){
	RowListViewDriver.call(this);

	this._eventStreamBus = new Bacon.Bus();

	this._element = rootElement;
	this._fullscreenViewDriver = fullscreenViewDriver;
	this._setupToolbarView();
	this._startWatchingForRowViews();
};

GmailRowListView.prototype = Object.create(RowListViewDriver.prototype);

_.extend(GmailRowListView.prototype, {

	__memberVariables: [
		{name: '_element', destroy: false, get: true},
		{name: '_fullscreenViewDriver', destroy: false, get: true},
		{name: '_toolbarView', destroy: true, get: true},
		{name: '_rowViews', destroy: true, get: true, defaultValue: []},
		{name: '_eventStreamBus', destroy: true, destroyFunction: 'end'}
	],

	getEventStream: function(){
		return this._eventStreamBus;
	},

	_setupToolbarView: function(){
		var toolbarElement = this._element.querySelector('[gh=mtb]');

		if(!toolbarElement){
			toolbarElement = this._findToolbarElement();
		}

		this._toolbarView = new GmailToolbarView(toolbarElement);
		this._toolbarView.setRowListViewDriver(this);
	},

	_findToolbarElement: function(){
		var toolbarContainerElements = document.querySelectorAll('[gh=tm]');
		for(var ii=0; ii<toolbarContainerElements.length; ii++){
			if(this._isToolbarContainerRelevant(toolbarContainerElements[ii])){
				return toolbarContainerElements[ii].querySelector('[gh=mtb]');
			}
		}

		return null;
	},

	_isToolbarContainerRelevant: function(toolbarContainerElement){
		if(toolbarContainerElement.parentElement.parentElement === this._element.parentElement.parentElement){
			return true;
		}

		if(toolbarContainerElement.parentElement.getAttribute('role') !== 'main' && this._element.parentElement.getAttribute('role') !== 'main'){
			return true;
		}

		return false;
	},

	_startWatchingForRowViews: function(){
		var self = this;
		var tbody;

		this._eventStreamBus.plug(
			Bacon.fromPromise(waitFor(function() {
				return !self._element ||
					(tbody = self._element.querySelector('div.Cp > div > table > tbody'));
			})).flatMap(function() {
				var elementStream = makeElementChildStream(tbody)
					.takeUntil(self._eventStreamBus.filter(false).mapEnd())
					.filter(function(event) {
						return event.el.classList.contains('zA');
					});

				return makeElementViewStream({
					elementStream: elementStream,
					viewFn: function(element){
						return new GmailThreadRowView(element);
					}
				}).map(function(view) {
					return {
						eventName: 'newGmailThreadRowView',
						view: view
					};
				});
			})
		);
	}
});

module.exports = GmailRowListView;
