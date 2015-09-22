/* @flow */
//jshint ignore:start

var Bacon = require('baconjs');
var Kefir = require('kefir');

export type RouteViewDriver = {
	getRouteType(): string;
	getRouteID(): string;
	getParams(): {[ix:string]:string};
	getEventStream(): Bacon.Observable;
	getStopper(): Kefir.Stream;
	getCustomViewElement(): ?HTMLElement;
	refresh(): void;
};

export default {
	getRouteType: 0,
	getRouteID: 0,
	getParams: 0,
	getEventStream: 0,
	getCustomViewElement: 0,
	refresh: 0
};
