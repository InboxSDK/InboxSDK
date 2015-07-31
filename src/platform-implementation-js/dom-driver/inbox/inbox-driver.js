import _ from 'lodash';
import RSVP from 'rsvp';

import * as Bacon from 'baconjs';
import * as Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';

import addAccessors from 'add-accessors';
import assertInterface from '../../lib/assert-interface';
import Driver from '../../driver-interfaces/driver';
import Logger from '../../lib/logger';
import injectScript from '../../lib/inject-script';

import streamWaitFor from '../../lib/stream-wait-for';
import makeElementChildStream from '../../lib/dom/make-element-child-stream';
import makeMutationObserverStream from '../../lib/dom/make-mutation-observer-stream';
import makeMutationObserverChunkedStream from '../../lib/dom/make-mutation-observer-chunked-stream';

import InboxRouteView from './views/inbox-route-view';

export default class InboxDriver {
  constructor(appId, opts, LOADER_VERSION, IMPL_VERSION, logger) {
    this._logger = logger;
    this._stopper = kefirStopper();
    this.onready = injectScript();

    // this._customRouteIDs = new Set();
    // this._customListRouteIDs = new Map();
    // this._customListSearchStringsToRouteIds = new Map();

    const mainAdds = streamWaitFor(() => document.getElementById('mQ'))
      .flatMap(el => makeElementChildStream(el));

    // tNsA5e-nUpftc nUpftc lk
    const mainViews = mainAdds.filter(({el}) => el.classList.contains('lk'))
      .map(({el}) => el.querySelector('div.cz[jsan]'))
      .flatMap(el =>
        makeMutationObserverChunkedStream(el, {
          attributes: true, attributeFilter: ['jsan']
        }).toProperty(null).map(() => el)
      )
      .map(el => ({el, jsan: el.getAttribute('jsan')}))
      .skipDuplicates((a, b) => a.jsan === b.jsan)
      .map(({el, jsan}) => new InboxRouteView(el));

    // tNsA5e-nUpftc nUpftc i5 xpv2f
    const searchViews = mainAdds.filter(({el}) =>
        !el.classList.contains('lk') &&
        el.classList.contains('i5') && el.classList.contains('xpv2f')
      )
      .map(({el}) => new InboxRouteView(el));

    this._routeViewDriverStream = Bacon.mergeAll(mainViews, searchViews);
    this._rowListViewDriverStream = Bacon.never();
    this._composeViewDriverStream = Bacon.never();
    this._threadViewDriverStream = Bacon.never();
    this._messageViewDriverStream = Bacon.never();
    this._threadRowViewDriverKefirStream = Kefir.never();
    this._toolbarViewDriverStream = Bacon.never();
  }

  openComposeWindow() {
    throw new Error("Not implemented");
  }

  createKeyboardShortcutHandle(a, b, c, d) {
    // stub
  }

  getUserEmailAddress() {
    return document.head.getAttribute('data-inboxsdk-user-email-address');
  }

  getUserContact() {
    return {
      emailAddress: this.getUserEmailAddress(),
      name: this.getUserEmailAddress()
    };
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

  setShowNativeNavMarker(value) {
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

  isRunningInPageContext() {
    // stub
    return false;
  }

  showAppIdWarning() {
    // stub
  }

  openDraftByMessageID(messageID) {
    throw new Error("Not implemented");
  }

  createModalViewDriver(a) {
    throw new Error("Not implemented");
  }
}

addAccessors(InboxDriver.prototype, [
  {name: '_logger', get: true},
  {name: '_stopper', get: true, destroy: true},
  {name: '_routeViewDriverStream', get: true},
  {name: '_rowListViewDriverStream', get: true},
  {name: '_composeViewDriverStream', get: true},
  {name: '_threadViewDriverStream', get: true},
  {name: '_messageViewDriverStream', get: true},
  {name: '_threadRowViewDriverKefirStream', get: true},
  {name: '_toolbarViewDriverStream', get: true},
  {name: '_butterBarDriver', get: true},
  {name: '_butterBar', get: true, set: true}
]);

assertInterface(InboxDriver.prototype, Driver);
