var _ = require('lodash');
const asap = require('asap');
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

	this._pendingExpansions = new Map();
	this._pendingExpansionsSignal = new Bacon.Bus();
	this._pendingExpansionsSignal.bufferWithTime(asap).onValue(this._expandColumnJob.bind(this));

	this._setupToolbarView();
	this._startWatchingForRowViews();
};

GmailRowListView.prototype = Object.create(RowListViewDriver.prototype);

_.extend(GmailRowListView.prototype, {

	__memberVariables: [
		{name: '_element', destroy: false, get: true},
		{name: '_routeViewDriver', destroy: false, get: true},
		{name: '_pendingExpansions', destroy: false},
		{name: '_pendingExpansionsSignal', destroy: false},
		{name: '_toolbarView', destroy: true, get: true},
		{name: '_threadRowViewDrivers', destroy: true, get: true, defaultValue: []},
		{name: '_eventStreamBus', destroy: true, destroyFunction: 'end'},
		{name: '_rowViewDriverStream', destroy: false, get: true}
	],

	getEventStream: function(){
		return this._eventStreamBus;
	},

	_setupToolbarView: function(){
		var toolbarElement = this._element.querySelector('[gh=mtb]');

		if(!toolbarElement){
			toolbarElement = this._findToolbarElement();
		}

		this._toolbarView = new GmailToolbarView(toolbarElement, this._routeViewDriver);
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
		if(!newTableParent || !newTableParent.parentElement){
			return;
		}

		const firstTableParent = newTableParent.parentElement.firstElementChild;
		if (firstTableParent !== newTableParent) {
			const firstCols = firstTableParent.querySelectorAll('table.cf > colgroup > col');
			const newCols = newTableParent.querySelectorAll('table.cf > colgroup > col');
			assert.strictEqual(firstCols.length, newCols.length);
			_.zip(firstCols, newCols).forEach(([firstCol, newCol]) => {
				newCol.style.width = firstCol.style.width;
			});
		}
	},

	expandColumn(colSelector, width) {
		const pendingWidth = this._pendingExpansions.get(colSelector);
		if (!pendingWidth || width > pendingWidth) {
			this._pendingExpansions.set(colSelector, width);
			this._pendingExpansionsSignal.push();
		}
	},

	_expandColumnJob() {
		if (!this._pendingExpansions) return;

		this._pendingExpansions.forEach((width, colSelector) => {
			_.each(this._element.querySelectorAll('table.cf > colgroup > '+colSelector), col => {
				const currentWidth = parseInt(col.style.width, 10);
				if (isNaN(currentWidth) || currentWidth < width) {
					col.style.width = width+'px';
				}
			});
		});
		this._pendingExpansions.clear();
	},

	_startWatchingForRowViews: function(){
		const tableDivParents = _.toArray(this._element.querySelectorAll('div.Cp'));

		const elementStream = Bacon.mergeAll(tableDivParents.map(makeElementChildStream)).flatMap(event => {
			this._fixColumnWidths(event.el);
			const tbody = event.el.querySelector('table > tbody');

			// In vertical preview pane mode, each thread row has three <tr>
			// elements. We just want to pass the first one to GmailThreadRowView().
			return makeElementChildStream(tbody)
				.takeUntil(event.removalStream)
				.filter(rowEvent => rowEvent.el.id);
		});

		this._rowViewDriverStream = elementStream
			.takeUntil(this._eventStreamBus.filter(false).mapEnd(null))
			.flatMap(makeElementViewStream(element => new GmailThreadRowView(element, this)));

		this._rowViewDriverStream.onValue(this, '_addThreadRowView');
	},

	_addThreadRowView: function(gmailThreadRowView){
		this._threadRowViewDrivers.push(gmailThreadRowView);

		gmailThreadRowView
			.getEventStream()
			.onEnd(() => {
				if(this._threadRowViewDrivers){
					const index = this._threadRowViewDrivers.indexOf(gmailThreadRowView);
					this._threadRowViewDrivers.splice(index, 1);
				}
			});
	}
});

module.exports = GmailRowListView;
