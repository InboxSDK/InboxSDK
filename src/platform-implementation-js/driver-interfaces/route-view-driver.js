/* @flow */
//jshint ignore:start

var Kefir = require('kefir');

import type GmailCollapsibleSectionView from '../dom-driver/gmail/views/gmail-collapsible-section-view';

export type RouteViewDriver = {
	getRouteType(): string;
	getRouteID(): string;
	getParams(): {[ix:string]:string};
	getEventStream(): Kefir.Observable<Object>;
	getStopper(): Kefir.Observable<any>;
	getCustomViewElement(): ?HTMLElement;
	refresh(): void;
	addCollapsibleSection(sectionDescriptorProperty: Kefir.Observable<?Object>, groupOrderHint: any): GmailCollapsibleSectionView;
	addSection(sectionDescriptorProperty: Kefir.Observable<?Object>, groupOrderHint: any): GmailCollapsibleSectionView;
};

export default {
	getRouteType: 0,
	getRouteID: 0,
	getParams: 0,
	getEventStream: 0,
	getCustomViewElement: 0,
	refresh: 0
};
