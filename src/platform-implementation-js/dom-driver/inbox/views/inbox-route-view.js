/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';

import RouteViewDriver from '../../../driver-interfaces/route-view-driver';
import assertInterface from '../../../lib/assert-interface';
import addAccessors from 'add-accessors';

// only used for constants
import Router from '../../../namespaces/router';

function getRouteID(path) {
  if (path === '') {
    return Router.NativeRouteIDs.INBOX;
  }
  if (_.includes(['snoozed', 'reminders', 'done', 'spam', 'trash'], path)) {
    return Router.NativeRouteIDs[path.toUpperCase()];
  }
  if (/search\//.test(path)) {
    return Router.NativeRouteIDs.SEARCH;
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
  _eventStream: Kefir.Bus;
  _customViewElement: ?HTMLElement = null;

  constructor(el: HTMLElement, type: string) {
    this._element = el;

    this._type = type;
    const path = document.location.pathname.slice(1);
    this._routeID = getRouteID(path);
    this._params = getParams(path);
    this._routeType = this._routeID === 'UNKNOWN' ? 'UNKNOWN' : 'LIST';
    this._eventStream = kefirBus();
    this._customViewElement = null;

    console.log('el jsan', el.getAttribute('jsan'));
    if (this._type === 'CUSTOM') {
    }
  }

  destroy(){
    this._eventStream.end();
    if(this._customViewElement) this._customViewElement.remove();
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

  getEventStream(): Kefir.Stream {
    return this._eventStream;
  }

  getCustomViewElement(): ?HTMLElement{
    return this._customViewElement;
  }

  refresh() {
    // stub
  }
}


assertInterface(InboxRouteView.prototype, RouteViewDriver);
