import _ from 'lodash';
import RSVP from 'rsvp';

import Bacon from 'baconjs';
import Kefir from 'kefir';

import addAccessors from '../../lib/add-accessors';
import assertInterface from '../../lib/assert-interface';
import Driver from '../../driver-interfaces/driver';
import Logger from '../../lib/logger';
import injectScript from '../../lib/inject-script';

export default class DummyDriver {
  constructor(appId, opts, LOADER_VERSION, IMPL_VERSION) {
    this._logger = new Logger(appId, opts, LOADER_VERSION, IMPL_VERSION);
    this.onready = injectScript();

    // this._customRouteIDs = new Set();
    // this._customListRouteIDs = new Map();
    // this._customListSearchStringsToRouteIds = new Map();

    this._routeViewDriverStream = new Bacon.Bus();
    this._rowListViewDriverStream = new Bacon.Bus();
    this._composeViewDriverStream = new Bacon.Bus();
    this._threadViewDriverStream = new Bacon.Bus();
    this._messageViewDriverStream = new Bacon.Bus();
    this._threadRowViewDriverKefirStream = new Kefir.Bus();
    this._toolbarViewDriverStream = new Bacon.Bus();
  }

  openComposeWindow() {
    throw new Error("Not implemented");
  }

  createKeyboardShortcutHandle(a, b, c) {
    // stub
  }

  getUserEmailAddress() {
    return document.head.getAttribute('data-inboxsdk-user-email-address');
  }

  addNavItem(a, b) {
    return {
      getEventStream: _.constant(Bacon.never())
    };
  }

  getSentMailNativeNavItem() {
    // never resolve
    return RSVP.Promise.resolve({
      getEventStream: _.constant(Bacon.never())
    });
  }

  createLink(a, b) {
    throw new Error("Not implemented");
  }

  goto(a, b) {
    throw new Error("Not implemented");
  }

  addCustomRouteID(a) {
    // stub
  }

  addCustomListRouteID(a, b) {
    // stub
  }

  showCustomRouteView(a) {
    throw new Error("Not implemented");
  }

  getCurrentActiveNavItem() {
    throw new Error("Not implemented");
  }

  setNativeRouteIDs(a) {
    // stub
  }

  setNativeListRouteIDs(a) {
    // stub
  }

  setRouteTypes(a) {
    // stub
  }

  registerSearchSuggestionsProvider(a) {
    // stub
  }

  registerSearchQueryRewriter(a) {
    // stub
  }

  addToolbarButtonForApp(a) {
    // stub
  }

  createModalViewDriver(a) {
    throw new Error("Not implemented");
  }
}

addAccessors(DummyDriver.prototype, [
  {name: '_logger', get: true},
  {name: '_routeViewDriverStream', get: true},
  {name: '_rowListViewDriverStream', get: true},
  {name: '_composeViewDriverStream', get: true},
  {name: '_threadViewDriverStream', get: true},
  {name: '_messageViewDriverStream', get: true},
  {name: '_threadRowViewDriverKefirStream', get: true},
  {name: '_toolbarViewDriverStream', get: true},
  {name: '_butterBarDriver', get: true}
]);

assertInterface(DummyDriver.prototype, Driver);
