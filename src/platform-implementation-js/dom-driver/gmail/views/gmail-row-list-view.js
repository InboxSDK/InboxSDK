import {defn} from 'ud';

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

const Kefir = require('kefir');
const kefirCast = require('kefir-cast');
const kefirMakeElementChildStream = require('../../../lib/dom/kefir-make-element-child-stream');
const kefirElementViewMapper = require('../../../lib/dom/kefir-element-view-mapper');


var GmailRowListView = function(rootElement, routeViewDriver, gmailDriver){
	RowListViewDriver.call(this);

	this._eventStreamBus = new Bacon.Bus();
	this._kstopper = kefirCast(Kefir, this._eventStreamBus.filter(false).mapEnd(null));
	this._gmailDriver = gmailDriver;

	this._element = rootElement;
	this._routeViewDriver = routeViewDriver;
	this._threadRowViewDrivers = new Set();

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
		{name: '_gmailDriver', destroy: false},
		{name: '_routeViewDriver', destroy: false, get: true},
		{name: '_pendingExpansions', destroy: false},
		{name: '_pendingExpansionsSignal', destroy: false},
		{name: '_toolbarView', destroy: true, get: true},
		{name: '_threadRowViewDrivers', destroy: true, get: true},
		{name: '_eventStreamBus', destroy: true, destroyFunction: 'end'},
		{name: '_rowViewDriverKefirStream', destroy: false, get: true}
	],

	getEventStream: function(){
		return this._eventStreamBus;
	},

	_setupToolbarView: function(){
		var toolbarElement = this._findToolbarElement();

		if (toolbarElement) {
			this._toolbarView = new GmailToolbarView(toolbarElement, this._routeViewDriver);
			this._toolbarView.setRowListViewDriver(this);
		} else {
			this._toolbarView = null;
		}
	},

	_findToolbarElement: function(){
		/* multiple inbox extra section */
		const firstTry = this._element.querySelector('[gh=mtb]');
		if (firstTry) {
			return firstTry;
		}
		const toolbarContainerElements = document.querySelectorAll('[gh=tm]');
		const el = _.find(toolbarContainerElements, toolbarContainerElement =>
			this._isToolbarContainerRelevant(toolbarContainerElement)
		);
		return el ? el.querySelector('[gh=mtb]') : null;
	},

	_isToolbarContainerRelevant: function(toolbarContainerElement){
		const relevant =
			/* regular */
			toolbarContainerElement.parentElement.parentElement === this._element.parentElement.parentElement.parentElement.parentElement.parentElement ||
			/* multiple inbox main section */
			toolbarContainerElement.parentElement.parentElement ===
			this._element.parentElement;
		return relevant;
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

		const elementKefirStream = Kefir.merge(tableDivParents.map(kefirMakeElementChildStream)).flatMap(event => {
			this._fixColumnWidths(event.el);
			const tbody = event.el.querySelector('table > tbody');

			// In vertical preview pane mode, each thread row has three <tr>
			// elements. We just want to pass the first one (which has an id) to
			// GmailThreadRowView().
			return kefirMakeElementChildStream(tbody)
				.takeUntilBy(event.removalStream)
				.filter(rowEvent => rowEvent.el.id);
		});

		this._rowViewDriverKefirStream = elementKefirStream
			.takeUntilBy(this._kstopper)
			.map(kefirElementViewMapper(element => new GmailThreadRowView(element, this, this._gmailDriver)));

		this._rowViewDriverKefirStream.onValue(x => this._addThreadRowView(x));
	},

	_addThreadRowView(gmailThreadRowView) {
		this._threadRowViewDrivers.add(gmailThreadRowView);

		gmailThreadRowView
			.getStopper()
			.takeUntilBy(this._kstopper)
			.onValue(() => {
				this._threadRowViewDrivers.delete(gmailThreadRowView);
			});
	}
});

module.exports = defn(module, GmailRowListView);
