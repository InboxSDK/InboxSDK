/* @flow */
//jshint ignore:start

var _ = require('lodash');
var RSVP = require('rsvp');

var Bacon = require('baconjs');
var Kefir = require('kefir');
import baconCast from 'bacon-cast';
import kefirStopper from 'kefir-stopper';

import Logger from '../../lib/logger';
import injectScript from '../../lib/inject-script';
import censorHTMLstring from '../../../common/censor-html-string';
import kefirWaitFor from '../../lib/kefir-wait-for';
import kefirDelayAsap from '../../lib/kefir-delay-asap';
import kmakeElementChildStream from '../../lib/dom/kefir-make-element-child-stream';
import kefirElementViewMapper from '../../lib/dom/kefir-element-view-mapper';
import kmakeMutationObserverStream from '../../lib/dom/kefir-make-mutation-observer-stream';
import kmakeMutationObserverChunkedStream from '../../lib/dom/kefir-make-mutation-observer-chunked-stream';

import InboxRouteView from './views/inbox-route-view';
import InboxComposeView from './views/inbox-compose-view';

import type ButterBar from '../../platform-implementation/butter-bar';
import type {Driver, ShortcutDescriptor} from '../../driver-interfaces/driver';
import type {ComposeViewDriver} from '../../driver-interfaces/compose-view-driver';

export default class InboxDriver {
  _logger: Logger;
  _stopper: Kefir.Stream&{destroy:()=>void};
  onready: Promise;
  _routeViewDriverStream: Bacon.Observable;
  _rowListViewDriverStream: Bacon.Observable;
  _composeViewDriverStream: Bacon.Observable<ComposeViewDriver>;
  _threadViewDriverStream: Bacon.Observable;
  _messageViewDriverStream: Bacon.Observable;
  _threadRowViewDriverKefirStream: Kefir.Stream;
  _toolbarViewDriverStream: Bacon.Observable;
  _butterBarDriver: Object;
  _butterBar: ButterBar;

  constructor(appId: string, opts: Object, LOADER_VERSION: string, IMPL_VERSION: string, logger: Logger) {
    this._logger = logger;
    this._stopper = kefirStopper();
    this.onready = injectScript().then(() => {
      this._logger.setUserEmailAddress(this.getUserEmailAddress());
    });

    // this._customRouteIDs = new Set();
    // this._customListRouteIDs = new Map();
    // this._customListSearchStringsToRouteIds = new Map();

    /*
    var mainAdds = streamWaitFor(() => document.getElementById('mQ'))
      .flatMap(el => makeElementChildStream(el));

    // tNsA5e-nUpftc nUpftc lk
    var mainViews = mainAdds.filter(({el}) => el.classList.contains('lk'))
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
    var searchViews = mainAdds.filter(({el}) =>
        !el.classList.contains('lk') &&
        el.classList.contains('i5') && el.classList.contains('xpv2f')
      )
      .map(({el}) => new InboxRouteView(el));
    */

    this._routeViewDriverStream = Bacon.never(); //Bacon.mergeAll(mainViews, searchViews);
    this._rowListViewDriverStream = Bacon.never();
    this._composeViewDriverStream = baconCast(Bacon,
      kefirWaitFor(() => document.querySelector('body > div[id][jsan] > div[id][jstcache] > div[jstcache] > div[id][jstcache]:first-child'))
        .flatMap(kmakeElementChildStream)
        .filter(({el}) => el.hasAttribute('jsnamespace') && el.hasAttribute('jstcache'))
        .flatMap(event =>
          // ignore the composes that get removed immediately
          kefirDelayAsap(event)
            .takeUntilBy(event.removalStream)
        )
        .map(kefirElementViewMapper((el: HTMLElement) => {
          var composeEl = el.querySelector('div[role=dialog]');
          if (!composeEl) {
            this._logger.error(new Error("compose dialog element not found"), {
              html: censorHTMLstring(el.innerHTML)
            });
            return null;
          }
          return new InboxComposeView(this, composeEl)
        }))
        .filter(Boolean)
        .takeUntilBy(this._stopper)
    );
    this._threadViewDriverStream = Bacon.never();
    this._messageViewDriverStream = Bacon.never();
    this._threadRowViewDriverKefirStream = Kefir.never();
    this._toolbarViewDriverStream = Bacon.never();
  }

  destroy() {
    this._stopper.destroy();
  }

  getLogger(): Logger {return this._logger;}
  getStopper(): Kefir.Stream {return this._stopper;}
  getRouteViewDriverStream(): Bacon.Observable {return this._routeViewDriverStream;}
  getRowListViewDriverStream(): Bacon.Observable {return this._rowListViewDriverStream;}
  getComposeViewDriverStream(): Bacon.Observable {return this._composeViewDriverStream;}
  getThreadViewDriverStream(): Bacon.Observable {return this._threadViewDriverStream;}
  getMessageViewDriverStream(): Bacon.Observable {return this._messageViewDriverStream;}
  getThreadRowViewDriverKefirStream(): Kefir.Stream {return this._threadRowViewDriverKefirStream;}
  getToolbarViewDriverStream(): Bacon.Observable {return this._toolbarViewDriverStream;}
  getButterBarDriver(): Object {return this._butterBarDriver;}
  getButterBar(): ButterBar {return this._butterBar;}
  setButterBar(bb: ButterBar) {this._butterBar = bb;}

  openComposeWindow(): void {
    throw new Error("Not implemented");
  }

  createKeyboardShortcutHandle(shortcutDescriptor: ShortcutDescriptor, appId: string, appName: ?string, appIconUrl: ?string): Object {
		// stub
    return {};
	}

  getUserEmailAddress(): string {
    return document.head.getAttribute('data-inboxsdk-user-email-address');
  }

  getUserContact(): Contact {
    return {
      emailAddress: this.getUserEmailAddress(),
      name: this.getUserEmailAddress()
    };
  }

  addNavItem(appId: string, navItemDescriptor: Object): Object {
    console.log('addNavItem not implemented');
    return {
      getEventStream: _.constant(Bacon.never())
    };
  }

  getSentMailNativeNavItem(): Promise<Object> {
    // stub, never resolve
    console.log('getSentMailNativeNavItem not implemented');
    return new Promise((resolve, reject) => {});
  }

  createLink(routeID: string, params: ?{[ix: string]: string}): any {
    throw new Error("Not implemented");
  }

  goto(routeID: string, params: ?{[ix: string]: string}): void {
    throw new Error("Not implemented");
  }

  addCustomRouteID(routeID: string): () => void {
    console.log('addCustomRouteID not implemented');
    return _.noop;
  }

  addCustomListRouteID(routeID: string, handler: Function): () => void {
    console.log('addCustomListRouteID not implemented');
    return _.noop;
  }

  showCustomRouteView(element: HTMLElement): void {
    throw new Error("Not implemented");
  }

  setShowNativeNavMarker(value: boolean) {
    // stub
  }

  registerSearchSuggestionsProvider(handler: Function) {
    console.log('registerSearchSuggestionsProvider not implemented');
  }

  registerSearchQueryRewriter(obj: Object) {
    console.log('registerSearchQueryRewriter not implemented');
  }

  addToolbarButtonForApp(buttonDescriptor: Object): Promise {
    console.log('addToolbarButtonForApp not implemented');
    return new Promise((resolve, reject) => {});
  }

  isRunningInPageContext(): boolean {
    return !!(global.gbar && global.gbar._CONFIG);
  }

  showAppIdWarning() {
    // stub
  }

  openDraftByMessageID(messageID: string): void {
    throw new Error("Not implemented");
  }

  createMoleViewDriver(options: Object): Object {
    throw new Error("Not implemented");
  }

  createModalViewDriver(options: Object): Object {
    throw new Error("Not implemented");
  }
}

// This function does not get executed. It's only checked by Flow to make sure
// this class successfully implements the type interface.
function __interfaceCheck() {
	var driver: Driver = new InboxDriver('', ({}: any), '', '', ({}: any));
}
