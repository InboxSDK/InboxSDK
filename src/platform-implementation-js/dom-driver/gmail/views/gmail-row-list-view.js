var _ = require('lodash');
var assert = require('assert');
var Bacon = require('baconjs');

var RowListViewDriver = require('../../../driver-interfaces/row-list-view-driver');

var GmailToolbarView = require('./gmail-toolbar-view');
var GmailThreadRowView = require('./gmail-thread-row-view');

var streamWaitFor = require('../../../lib/stream-wait-for');
var makeElementChildStream = require('../../../lib/dom/make-element-child-stream');
var makeElementViewStream = require('../../../lib/dom/make-element-view-stream');

var GmailRowListView = function(rootElement, routeViewDriver){
	RowListViewDriver.call(this);

	this._eventStreamBus = new Bacon.Bus();

	this._element = rootElement;
	this._routeViewDriver = routeViewDriver;
	this._setupToolbarView();
	this._startWatchingForRowViews();
};

GmailRowListView.prototype = Object.create(RowListViewDriver.prototype);

_.extend(GmailRowListView.prototype, {

	__memberVariables: [
		{name: '_element', destroy: false, get: true},
		{name: '_routeViewDriver', destroy: false, get: true},
		{name: '_toolbarView', destroy: true, get: true},
		{name: '_threadRowViewDrivers', destroy: true, get: true, defaultValue: []},
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

	// When a new table is added to a row list, if an existing table has had its
	// column widths modified (by GmailThreadRowView), then the new table needs to
	// match.
	_fixColumnWidths: function(newTableParent) {
		var firstTableParent = newTableParent.parentElement.firstElementChild;
		if (firstTableParent !== newTableParent) {
			var firstCols = firstTableParent.querySelectorAll('table.cf > colgroup > col');
			var newCols = newTableParent.querySelectorAll('table.cf > colgroup > col');
			assert.strictEqual(firstCols.length, newCols.length);
			_.zip(firstCols, newCols).forEach(function(colPair) {
				var firstCol = colPair[0], newCol = colPair[1];
				newCol.style.width = firstCol.style.width;
			});
		}
	},

	_startWatchingForRowViews: function(){
		var self = this;

		var tableDivParent = self._element.querySelector('div.Cp');

		var elementStream = makeElementChildStream(tableDivParent).flatMap(function(event) {
			self._fixColumnWidths(event.el);
			var tbody = event.el.querySelector('table > tbody');
			return makeElementChildStream(tbody).takeUntil(event.removalStream).filter(function(event) {
				return event.el.classList.contains('zA');
			});
		});

		this._eventStreamBus.plug(
			elementStream
				.flatMap(makeElementViewStream(function(element) {
					// In vertical preview pane mode, each thread row has three <tr>
					// elements. We just want to pass the first one to GmailThreadRowView().
					if (element.hasAttribute('id')) {
						return new GmailThreadRowView(element);
					}
				}))
				.doAction(this, '_addThreadRowView')
				.map(function(view) {
					return {
						eventName: 'newGmailThreadRowView',
						view: view
					};
				})
		);
	},

	_addThreadRowView: function(gmailThreadRowView){
		this._threadRowViewDrivers.push(gmailThreadRowView);

		var self = this;
		gmailThreadRowView
			.getEventStream()
			.onEnd(function(){
				if(self._threadRowViewDrivers){
					var index = self._threadRowViewDrivers.indexOf(gmailThreadRowView);
					self._threadRowViewDrivers.splice(index, 1);
				}
			});
	}
});

module.exports = GmailRowListView;
