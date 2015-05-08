import _ from 'lodash';
import Bacon from 'baconjs';

import RouteViewDriver from '../../../driver-interfaces/route-view-driver';
import assertInterface from '../../../lib/assert-interface';
import addAccessors from 'add-accessors';

// only used for constants
import Router from '../../../platform-implementation/router';

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
  constructor(el, type) {
    this._element = el;

    this._type = type;
    const path = document.location.pathname.slice(1);
    this._routeID = getRouteID(path);
    this._params = getParams(path);
    this._routeType = this._routeID === 'UNKNOWN' ? 'UNKNOWN' : 'LIST';
    this._eventStream = new Bacon.Bus();
    this._customViewElement = null;

    console.log('el jsan', el.getAttribute('jsan'));
    if (this._type === 'CUSTOM') {
    }
  }
}

addAccessors(InboxRouteView.prototype, [
  {name: '_element', get: true},
  {name: '_type', get: true},
  {name: '_routeType', get: true},
  {name: '_routeID', get: true},
  {name: '_params', get: true},
  {name: '_eventStream', get: true, destroyMethod: 'end'},
  {name: '_customViewElement', get: true, destroyMethod: 'remove'}
]);

assertInterface(InboxRouteView.prototype, RouteViewDriver);
