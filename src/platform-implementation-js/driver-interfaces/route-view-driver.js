/* @flow */

import type Kefir from 'kefir';

import type GmailCollapsibleSectionView from '../dom-driver/gmail/views/gmail-collapsible-section-view';

// The necessary interface that Router and RouteView expect.
export type MinRouteViewDriver = {
	getRouteType(): string;
	getRouteID(): string;
	getParams(): {[ix:string]:string};
	getEventStream(): Kefir.Observable<Object>;
	getStopper(): Kefir.Observable<any>;
};

// The necessary interface that ListRouteView and CustomRouteView expect.
export type RouteViewDriver = MinRouteViewDriver&{
	refresh(): void;
	getType(): string;
	getHash(): string;
	addSection(sectionDescriptorProperty: Kefir.Observable<?Object>, groupOrderHint: any): GmailCollapsibleSectionView;
	addCollapsibleSection(sectionDescriptorProperty: Kefir.Observable<?Object>, groupOrderHint: any): GmailCollapsibleSectionView;

	getCustomViewElement(): ?HTMLElement;
	setFullWidth(fullWidth: boolean): void;
};
