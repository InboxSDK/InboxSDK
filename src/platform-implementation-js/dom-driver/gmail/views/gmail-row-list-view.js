/* @flow */

import {defn} from 'ud';

import _ from 'lodash';
import asap from 'asap';
import assert from 'assert';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import elementViewMapper from '../../../lib/dom/element-view-mapper';

import GmailToolbarView from './gmail-toolbar-view';
import GmailThreadRowView from './gmail-thread-row-view';

import streamWaitFor from '../../../lib/stream-wait-for';
import makeElementChildStream from '../../../lib/dom/make-element-child-stream';
import makeElementViewStream from '../../../lib/dom/make-element-view-stream';

import type GmailDriver from '../gmail-driver';
import type GmailRouteView from './gmail-route-view/gmail-route-view';

class GmailRowListView {

	_element: HTMLElement;
	_gmailDriver: GmailDriver;
	_routeViewDriver: GmailRouteView;
	_pendingExpansions: Map;
	_pendingExpansionsSignal: Kefir.Bus;
	_toolbarView: ?GmailToolbarView;
	_threadRowViewDrivers: Set<GmailThreadRowView>;
	_eventStreamBus: Kefir.Bus;
	_rowViewDriverStream: Kefir.Stream<GmailThreadRowView>;
	_stopper: Kefir.Stream&{destroy(): void};

	constructor(rootElement: HTMLElement, routeViewDriver: GmailRouteView, gmailDriver: GmailDriver){

		this._eventStreamBus = kefirBus();
		this._stopper = this._eventStreamBus.filter(() => false).beforeEnd(() => null);
		this._gmailDriver = gmailDriver;

		this._element = rootElement;
		this._routeViewDriver = routeViewDriver;
		this._threadRowViewDrivers = new Set();

		this._pendingExpansions = new Map();
		this._pendingExpansionsSignal = kefirBus();
		this._pendingExpansionsSignal.bufferWithTimeOrCount(1, 1000).onValue(this._expandColumnJob.bind(this));

		this._setupToolbarView();
		this._startWatchingForRowViews();
	}

	destroy(){
		this._threadRowViewDrivers.forEach(threadRow => threadRow.destroy());
		this._eventStreamBus.end();
	}

	getElement(): HTMLElement {
		return this._element;
	}

	getRouteViewDriver(): GmailRouteView {
		return this._routeViewDriver;
	}

	getToolbarView(): ?GmailToolbarView {
		return this._toolbarView;
	}

	getThreadRowViewDrivers(): Set<GmailThreadRowView> {
		return this._threadRowViewDrivers;
	}

	getRowViewDriverStream(): Kefir.Stream<GmailThreadRowView> {
		return this._rowViewDriverStream;
	}

	getEventStream(): Kefir.Stream {
		return this._eventStreamBus;
	}

	_setupToolbarView(){
		var toolbarElement = this._findToolbarElement();

		if (toolbarElement) {
			this._toolbarView = new GmailToolbarView(toolbarElement, this._routeViewDriver, this);
		} else {
			this._toolbarView = null;
		}
	}

	_findToolbarElement(){
		/* multiple inbox extra section */
		const firstTry = this._element.querySelector('[gh=mtb]');
		if (firstTry) {
			return firstTry;
		}
		const el = _.find(document.querySelectorAll('[gh=tm]'), toolbarContainerElement =>
			toolbarContainerElement.parentElement.parentElement ===
			(this._element:any).parentElement.parentElement.parentElement.parentElement.parentElement ||
			toolbarContainerElement.parentElement.parentElement ===
			this._element.parentElement
		);
		return el ? el.querySelector('[gh=mtb]') : null;
	}

	// When a new table is added to a row list, if an existing table has had its
	// column widths modified (by GmailThreadRowView), then the new table needs to
	// match.
	_fixColumnWidths(newTableParent: ?HTMLElement) {
		if(!newTableParent || !newTableParent.parentElement){
			return;
		}

		const firstTableParent = newTableParent.parentElement.firstElementChild;
		if (firstTableParent !== newTableParent && firstTableParent) {
			const firstCols = firstTableParent.querySelectorAll('table.cf > colgroup > col');
			const newCols = newTableParent.querySelectorAll('table.cf > colgroup > col');
			assert.strictEqual(firstCols.length, newCols.length);
			_.zip(firstCols, newCols).forEach(([firstCol, newCol]) => {
				newCol.style.width = firstCol.style.width;
			});
		}
	}

	expandColumn(colSelector: string, width: number) {
		const pendingWidth = this._pendingExpansions.get(colSelector);
		if (!pendingWidth || width > pendingWidth) {
			this._pendingExpansions.set(colSelector, width);
			this._pendingExpansionsSignal.emit();
		}
	}

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
	}

	_startWatchingForRowViews() {
		const tableDivParents = _.toArray(this._element.querySelectorAll('div.Cp'));

		const elementStream = Kefir.merge(tableDivParents.map(makeElementChildStream)).flatMap(event => {
			this._fixColumnWidths(event.el);
			const tbody = event.el.querySelector('table > tbody');

			// In vertical preview pane mode, each thread row has three <tr>
			// elements. We just want to pass the first one (which has an id) to
			// GmailThreadRowView().
			return makeElementChildStream(tbody)
				.takeUntilBy(event.removalStream)
				.filter(rowEvent => rowEvent.el.id);
		});

		this._rowViewDriverStream = elementStream
			.takeUntilBy(this._stopper)
			.map(elementViewMapper(element => new GmailThreadRowView(element, this, this._gmailDriver)));

		this._rowViewDriverStream.onValue(x => this._addThreadRowView(x));
	}

	_addThreadRowView(gmailThreadRowView: GmailThreadRowView) {
		this._threadRowViewDrivers.add(gmailThreadRowView);

		gmailThreadRowView
			.getStopper()
			.takeUntilBy(this._stopper)
			.onValue(() => {
				this._threadRowViewDrivers.delete(gmailThreadRowView);
			});
	}
}

export default GmailRowListView = defn(module, GmailRowListView);
