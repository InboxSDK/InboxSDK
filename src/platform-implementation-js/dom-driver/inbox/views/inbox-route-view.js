/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import kefirBus from 'kefir-bus';

import type {RouteViewDriver} from '../../../driver-interfaces/route-view-driver';

import {NATIVE_ROUTE_IDS} from '../../../constants/router';

function getRouteID(path) {
  if (path === '') {
    return NATIVE_ROUTE_IDS.INBOX;
  }
  if (_.includes(['snoozed', 'reminders', 'done', 'spam', 'trash'], path)) {
    return NATIVE_ROUTE_IDS[path.toUpperCase()];
  }
  if (/search\//.test(path)) {
    return NATIVE_ROUTE_IDS.SEARCH;
  }
  return 'UNKNOWN';
}

function getParams(path) {
  const parts = path.split('/');
  if (parts.length < 2) {
    return {};
  }
  return {
    query: decodeURIComponent(parts[1])
  };
}

export default class InboxRouteView {
  _element: HTMLElement;
  _type: string;
  _routeType: string;
  _routeID: string;
  _params: Object;
  _eventStream = kefirBus();
  _stopper = kefirStopper();

  constructor(el: HTMLElement, type: string) {
    // Check we implement interface
    (this: RouteViewDriver);

    this._element = el;

    this._type = type;
    const path = document.location.pathname.slice(1);
    this._routeID = getRouteID(path);
    this._params = getParams(path);
    this._routeType = this._routeID === 'UNKNOWN' ? 'UNKNOWN' : 'LIST';

    console.log('el jsan', el.getAttribute('jsan'));
    if (this._type === 'CUSTOM') {
    }
  }

  getStopper() {
    return this._stopper;
  }

  destroy(){
    this._eventStream.end();
    this._stopper.destroy();
  }

  getElement(): HTMLElement {
    return this._element;
  }

  getType(): string {
    return this._type;
  }

  getRouteType(): string {
    return this._routeType;
  }

  getRouteID(): string {
    return this._routeID;
  }

  getParams(): Object {
    return this._params;
  }

  getEventStream(): Kefir.Observable<Object> {
    return this._eventStream;
  }

  getCustomViewElement(): ?HTMLElement{
    return null;
  }

  refresh() {
    // stub
  }

  getHash(): string {
    throw new Error('should not happen');
  }

  getCustomViewElement(): ?HTMLElement {
    throw new Error('should not happen');
  }

  addCollapsibleSection(sectionDescriptorProperty: Kefir.Observable<?Object>, groupOrderHint: any) {
    throw new Error('not implemented yet');
  }

  addSection(sectionDescriptorProperty: Kefir.Observable<?Object>, groupOrderHint: any) {
    throw new Error('not implemented yet');
  }

  setFullWidth(fullWidth: boolean) {
    throw new Error('should not happen');
  }
}
