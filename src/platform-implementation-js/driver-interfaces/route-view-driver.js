/* @flow */
//jshint ignore:start

var Bacon = require('baconjs');
var Kefir = require('kefir');

import type GmailCollapsibleSectionView from '../dom-driver/gmail/views/gmail-collapsible-section-view';

export type RouteViewDriver = {
	getRouteType(): string;
	getRouteID(): string;
	getParams(): {[ix:string]:string};
	getEventStream(): Bacon.Observable;
	getStopper(): Kefir.Stream;
	getCustomViewElement(): ?HTMLElement;
	refresh(): void;
	addCollapsibleSection(sectionDescriptorProperty: Bacon.Observable<?Object>, groupOrderHint: any): GmailCollapsibleSectionView;
	addSection(sectionDescriptorProperty: Bacon.Observable<?Object>, groupOrderHint: any): GmailCollapsibleSectionView;
};

export default {
	getRouteType: 0,
	getRouteID: 0,
	getParams: 0,
	getEventStream: 0,
	getCustomViewElement: 0,
	refresh: 0
};
