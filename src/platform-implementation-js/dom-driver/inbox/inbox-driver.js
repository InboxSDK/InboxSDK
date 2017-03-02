/* @flow */

import _ from 'lodash';
import autoHtml from 'auto-html';
import RSVP from 'rsvp';

import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type {Bus} from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import type {Stopper} from 'kefir-stopper';
import {defn} from 'ud';

import LiveSet from 'live-set';
import lsFilter from 'live-set/filter';
import lsFlatMap from 'live-set/flatMap';
import lsMapWithRemoval from 'live-set/mapWithRemoval';
import toValueObservable from 'live-set/toValueObservable';
import type PageParserTree from 'page-parser-tree';
import makePageParserTree from './makePageParserTree';

import Logger from '../../lib/logger';
import ItemWithLifetimePool from '../../lib/ItemWithLifetimePool';
import toItemWithLifetimePool from '../../lib/toItemWithLifetimePool';
import toItemWithLifetimeStream from '../../lib/toItemWithLifetimeStream';
import injectScript from '../../lib/inject-script';
import fromEventTargetCapture from '../../lib/from-event-target-capture';
import populateRouteID from '../../lib/populateRouteID';
import simulateKey from '../../lib/dom/simulate-key';
import setCss from '../../lib/dom/set-css';
import querySelector from '../../lib/dom/querySelectorOrFail';
import customStyle from './custom-style';
import censorHTMLstring from '../../../common/censor-html-string';
import censorHTMLtree from '../../../common/censor-html-tree';
import type KeyboardShortcutHandle from '../../views/keyboard-shortcut-handle';
import getComposeViewDriverStream from './get-compose-view-driver-stream';

import type {ItemWithLifetime, ElementWithLifetime} from '../../lib/dom/make-element-child-stream';
import querySelectorOne from '../../lib/dom/querySelectorOne';
import idMap from '../../lib/idMap';
import makeMutationObserverChunkedStream from '../../lib/dom/make-mutation-observer-chunked-stream';
import getSidebarClassnames from './getSidebarClassnames';
import InboxButterBarDriver from './inbox-butter-bar-driver';

import threadParser from './detection/thread/parser';
import messageParser from './detection/message/parser';
import attachmentCardParser from './detection/attachmentCard/parser';
import attachmentOverlayParser from './detection/attachmentOverlay/parser';
import nativeDrawerParser from './detection/nativeDrawer/parser';
import searchBarParser from './detection/searchBar/parser';
import chatSidebarParser from './detection/chatSidebar/parser';
import appToolbarLocationParser from './detection/appToolbarLocation/parser';

import setupRouteViewDriverStream from './setupRouteViewDriverStream';

import type InboxRouteView from './views/inbox-route-view';
import type InboxCustomRouteView from './views/inbox-custom-route-view';
import type InboxComposeView from './views/inbox-compose-view';
import InboxThreadView from './views/inbox-thread-view';
import InboxMessageView from './views/inbox-message-view';
import InboxAttachmentCardView from './views/inbox-attachment-card-view';
import InboxAttachmentOverlayView from './views/inbox-attachment-overlay-view';
import InboxChatSidebarView from './views/inbox-chat-sidebar-view';

import InboxAppSidebarView from './views/inbox-app-sidebar-view';

import InboxAppToolbarButtonView from './views/inbox-app-toolbar-button-view';
import InboxPageCommunicator from './inbox-page-communicator';
import InboxModalView from './views/inbox-modal-view';
import InboxDrawerView from './views/inbox-drawer-view';
import InboxBackdrop from './views/inbox-backdrop';
import type ButterBar from '../../namespaces/butter-bar';
import type {RouteParams} from '../../namespaces/router';
import type {Driver} from '../../driver-interfaces/driver';
import type {PiOpts, EnvData} from '../../platform-implementation';

class InboxDriver {
  _appId: string;
  _logger: Logger;
  _opts: PiOpts;
  _envData: EnvData;
  _stopper: Stopper;
  onready: Promise<void>;
  _page: PageParserTree;
  _routeViewDriverStream: Kefir.Observable<*>;
  _rowListViewDriverStream: Kefir.Observable<any>;
  _composeViewDriverPool: ItemWithLifetimePool<ItemWithLifetime<InboxComposeView>>;
  _threadViewDriverLiveSet: LiveSet<InboxThreadView>;
  _messageViewDriverLiveSet: LiveSet<InboxMessageView>;
  _attachmentCardViewDriverLiveSet: LiveSet<InboxAttachmentCardView>;
  _attachmentOverlayViewDriverLiveSet: LiveSet<InboxAttachmentOverlayView>;
  _chatSidebarViewLiveSet: LiveSet<InboxChatSidebarView>;
  _threadViewElements: WeakMap<HTMLElement, InboxThreadView> = new WeakMap();
  _messageViewElements: WeakMap<HTMLElement, InboxMessageView> = new WeakMap();
  _threadRowViewDriverKefirStream: Kefir.Observable<any>;
  _toolbarViewDriverStream: Kefir.Observable<any>;
  _butterBarDriver = new InboxButterBarDriver();
  _butterBar: ButterBar;
  _pageCommunicator: InboxPageCommunicator;
  _lastInteractedAttachmentCardView: ?InboxAttachmentCardView = null;
  _lastInteractedAttachmentCardViewSet: Bus<any> = kefirBus();
  _appSidebarView: ?InboxAppSidebarView = null;
  _customRouteIDs: Set<string> = new Set();

  constructor(appId: string, LOADER_VERSION: string, IMPL_VERSION: string, logger: Logger, opts: PiOpts, envData: EnvData) {
    (this: Driver); // interface check
    customStyle();
    this._appId = appId;
    this._logger = logger;
    this._opts = opts;
    this._envData = envData;
    this._stopper = kefirStopper();
    this._pageCommunicator = new InboxPageCommunicator();

    this._page = makePageParserTree(this, document);
    this._stopper.onValue(() => this._page.dump());

    this.onready = injectScript().then(() => {
      this._logger.setUserEmailAddress(this.getUserEmailAddress());
    });

    this._threadViewDriverLiveSet = lsMapWithRemoval(this._page.tree.getAllByTag('thread'), (node, removal) => {
      const el = node.getValue();
      const parsed = threadParser(el);
      if (parsed.errors.length) {
        this._logger.errorSite(new Error('parse errors (thread)'), {
          score: parsed.score,
          errors: parsed.errors,
          html: censorHTMLtree(el)
        });
      }
      const view = new InboxThreadView(el, this, parsed);
      removal.then(() => {
        view.destroy();
      });
      return view;
    });

    this._messageViewDriverLiveSet = lsFlatMap(
      this._page.tree.getAllByTag('message'),
      node => {
        const el = node.getValue();
        let parsed = messageParser(el);
        if (parsed.errors.length > 0) {
          this._logger.errorSite(new Error('parse errors (message)'), {
            score: parsed.score,
            errors: parsed.errors,
            html: censorHTMLtree(el)
          });
        }
        if (parsed.attributes.isDraft) return LiveSet.constant(new Set());
        return new LiveSet({
          read() {
            throw new Error();
          },
          listen: (setValues, controller) => {
            setValues(new Set());
            const unsub = kefirStopper();

            // If the InboxMessageView is destroyed before the element is removed,
            // then make a new InboxMessageView out of the same element. Inbox re-uses
            // elements for different messages in some cases.
            const newView = firstRun => {
              if (!firstRun) {
                parsed = messageParser(el);
                if (parsed.errors.length > 0) {
                  this._logger.errorSite(new Error(`message reparse errors`), {
                    score: parsed.score,
                    errors: parsed.errors,
                    html: censorHTMLtree(el)
                  });
                }
              }
              const view = new InboxMessageView(el, this, parsed);
              view.getStopper().takeUntilBy(unsub).onValue(() => {
                controller.remove(view);
                newView(false);
              });
              unsub.takeUntilBy(view.getStopper()).onValue(() => {
                view.destroy();
              });
              controller.add(view);
            };

            newView(true);

            return () => {
              unsub.destroy();
            };
          }
        });
      }
    );

    this._attachmentCardViewDriverLiveSet = lsMapWithRemoval(this._page.tree.getAllByTag('attachmentCard'), (node, removal) => {
      const el = node.getValue();
      const parsed = attachmentCardParser(el);
      if (parsed.errors.length) {
        this._logger.errorSite(new Error('parse errors (attachmentCard)'), {
          score: parsed.score,
          errors: parsed.errors,
          html: censorHTMLtree(el)
        });
      }
      const view = new InboxAttachmentCardView({element: el, parsed}, this);
      removal.then(() => {
        view.destroy();
      });
      return view;
    });

    this._attachmentOverlayViewDriverLiveSet = lsFlatMap(this._page.tree.getAllByTag('attachmentOverlay'), node => {
      const el = node.getValue();
      const parsed = attachmentOverlayParser(el);
      if (parsed.errors.length) {
        this._logger.errorSite(new Error('parse errors (attachmentOverlay)'), {
          score: parsed.score,
          errors: parsed.errors,
          html: censorHTMLtree(el)
        });
      }
      const cardView = this.getLastInteractedAttachmentCardView();
      if (!cardView) {
        this._logger.error(new Error('Encountered overlay without knowing cardView'));
        return LiveSet.constant(new Set());
      }

      return new LiveSet({
        read() {throw new Error()},
        listen: setValues => {
          const view = new InboxAttachmentOverlayView(this, el, parsed, cardView);
          setValues(new Set([view]));
          return () => {
            view.destroy();
          };
        }
      });
    });
    this._attachmentOverlayViewDriverLiveSet.subscribe({}); // force activation

    this._composeViewDriverPool = new ItemWithLifetimePool(
      getComposeViewDriverStream(this, this._page.tree).takeUntilBy(this._stopper)
        .map(el => ({el, removalStream: el.getStopper()}))
    );

    this._chatSidebarViewLiveSet = lsMapWithRemoval(this._page.tree.getAllByTag('chatSidebar'), (node, removal) => {
      const el = node.getValue();
      const parsed = chatSidebarParser(el);
      if (parsed.errors.length) {
        this._logger.errorSite(new Error('parse errors (chatSidebar)'), {
          score: parsed.score,
          errors: parsed.errors,
          html: censorHTMLtree(el)
        });
      }
      const view = new InboxChatSidebarView(el, parsed);
      removal.then(() => {
        view.destroy();
      });
      return view;
    });
    this._chatSidebarViewLiveSet.subscribe({});

    this._routeViewDriverStream = setupRouteViewDriverStream(this);

    this._rowListViewDriverStream = Kefir.never();
    this._threadRowViewDriverKefirStream = Kefir.never();
    this._toolbarViewDriverStream = Kefir.never();

    this._composeViewDriverPool.items().onError(err => {
      // If we get here, it's probably because of a waitFor timeout caused by
      // us failing to find the compose parent. Let's log the results of a few
      // similar selectors to see if our selector was maybe slightly wrong.
      function getStatus() {
        return {
          mainLength: document.querySelectorAll('[role=main]').length,
          regularLength: document.querySelectorAll('body > div[id][jsaction] > div[id][class]:not([role]) > div[class] > div[id]').length,
          noJsActionLength: document.querySelectorAll('body > div[id] > div[id][class]:not([role]) > div[class] > div[id]').length,
          noNotLength: document.querySelectorAll('body > div[id][jsaction] > div[id][class] > div[class] > div[id]').length,
          noBodyDirectChildLength: document.querySelectorAll('body div[id][jsaction] > div[id][class]:not([role]) > div[class] > div[id]').length,
          noBodyLength: document.querySelectorAll('div[id][jsaction] > div[id][class]:not([role]) > div[class] > div[id]').length,
          // We can use class names for logging heuristics. Don't want to use
          // them anywhere else.
          classLength: document.querySelectorAll('div.ek div.md > div').length,
          classEkLength: document.querySelectorAll('.ek').length,
          classMdLength: document.querySelectorAll('.md').length,
          composeHtml: _.map(document.querySelectorAll('body > div[id][jsaction] > div[id][class]:not([role]) > div[class] > div[id], div.ek div.md > div'), el => censorHTMLtree(el))
        };
      }

      var startStatus = getStatus();
      var waitTime = 180*1000;
      this._logger.error(err, startStatus);
      setTimeout(() => {
        var laterStatus = getStatus();
        this._logger.eventSdkPassive('waitfor compose data', {
          startStatus, waitTime, laterStatus
        });
      }, waitTime);
    });

    Kefir.later(30*1000)
      .takeUntilBy(toItemWithLifetimeStream(this._page.tree.getAllByTag('appToolbarLocation')))
      .onValue(() => {
        this._logger.errorSite(new Error('Failed to find appToolbarLocation'));
      });

    toValueObservable(this._page.tree.getAllByTag('searchBar')).subscribe(({value: node}) => {
      const el = node.getValue();
      const parsed = searchBarParser(el);
      if (parsed.errors.length) {
        this._logger.errorSite(new Error('parse errors (searchBar)'), {
          score: parsed.score,
          errors: parsed.errors,
          html: censorHTMLtree(el)
        });
      }
    });

    Kefir.later(30*1000)
      .takeUntilBy(toItemWithLifetimeStream(this._page.tree.getAllByTag('searchBar')))
      .onValue(() => {
        this._logger.errorSite(new Error('Failed to find searchBar'));
      });

    toValueObservable(this._page.tree.getAllByTag('nativeDrawer')).subscribe(({value: node}) => {
      const el = node.getValue();
      const parsed = nativeDrawerParser(el);
      if (parsed.errors.length) {
        this._logger.errorSite(new Error('parse errors (nativeDrawer)'), {
          score: parsed.score,
          errors: parsed.errors,
          html: censorHTMLtree(el)
        });
      }
    });

    // When a user goes from one thread to another, a new thread view is made
    // but the old thread view doesn't get destroyed until it finishes
    // animating out. We need to clear the old thread view's sidebar
    // immediately when a new thread view comes in.
    let _currentThreadView = null;
    this._threadViewDriverLiveSet.subscribe(changes => {
      changes.forEach(change => {
        if (change.type === 'add') {
          const threadView = change.value;
          if (_currentThreadView) {
            _currentThreadView.removePanels();
          }
          _currentThreadView = threadView;
        }
      });
    });
  }

  destroy() {
    this._stopper.destroy();
  }

  getAppId() {
    return this._appId;
  }
  getOpts(): PiOpts {return this._opts;}
  getLogger(): Logger {return this._logger;}
  getStopper(): Kefir.Observable<null> {return this._stopper;}
  getRouteViewDriverStream() {return this._routeViewDriverStream;}
  getRowListViewDriverStream() {return this._rowListViewDriverStream;}
  getComposeViewDriverStream() {return this._composeViewDriverPool.items().map(({el})=>el);}
  getThreadViewDriverStream() {
    return toItemWithLifetimeStream(this._threadViewDriverLiveSet).map(({el})=>el);
  }
  getMessageViewDriverStream() {
    return toItemWithLifetimeStream(this._messageViewDriverLiveSet).map(({el})=>el);
  }
  getAttachmentCardViewDriverStream() {
    return toItemWithLifetimeStream(this._attachmentCardViewDriverLiveSet).map(({el})=>el);
  }
  getThreadRowViewDriverStream() {return this._threadRowViewDriverKefirStream;}
  getToolbarViewDriverStream() {return this._toolbarViewDriverStream;}
  getButterBarDriver(): Object {return this._butterBarDriver;}
  getButterBar(): ButterBar {return this._butterBar;}
  setButterBar(bb: ButterBar) {this._butterBar = bb;}
  getPageCommunicator(): InboxPageCommunicator {return this._pageCommunicator;}

  getThreadViewElementsMap() {return this._threadViewElements;}
  getMessageViewElementsMap() {return this._messageViewElements;}

  getCustomRouteIDs(): Set<string> {return this._customRouteIDs;}

  getCurrentChatSidebarView(): InboxChatSidebarView {
    const view = Array.from(this._chatSidebarViewLiveSet.values())[0];
    if (!view) throw new Error('No chat sidebar found');
    return view;
  }

  getAppSidebarView(): InboxAppSidebarView {
    if (!this._appSidebarView) {
      this._appSidebarView = new InboxAppSidebarView(this);
    }
    return this._appSidebarView;
  }

  getChatSidebarButton(): HTMLElement {
    const appToolbarLocationNode = Array.from(this._page.tree.getAllByTag('appToolbarLocation').values())[0];
    const parsed = appToolbarLocationNode ? appToolbarLocationParser(appToolbarLocationNode.getValue()) : null;
    const el = parsed ? parsed.elements.chatSidebarButton : null;
    if (!el) throw new Error('No chat sidebar button found');
    return el;
  }

  getLastInteractedAttachmentCardView() {
    return this._lastInteractedAttachmentCardView;
  }
  setLastInteractedAttachmentCardView(card: InboxAttachmentCardView) {
    this._lastInteractedAttachmentCardViewSet.emit();
    this._lastInteractedAttachmentCardView = card;
    if (card) {
      card.getStopper()
        .merge(fromEventTargetCapture((document.body:any), 'click'))
        .take(1)
        .takeUntilBy(this._lastInteractedAttachmentCardViewSet)
        .takeUntilBy(this._stopper)
        .onValue(() => {
          this._lastInteractedAttachmentCardView = null;
        });
    }
  }

  openComposeWindow(): void {
    const fabButton = querySelectorOne((document.body:any), 'nav[role=banner] ~ div[aria-expanded] button:not([tabindex="-1"])');
    fabButton.click();
  }

  activateShortcut(keyboardShortcutHandle: KeyboardShortcutHandle, appName: ?string, appIconUrl: ?string): void {
    console.warn('activateShortcut not implemented');
  }

  getUserEmailAddress(): string {
    const s = (document.head:any).getAttribute('data-inboxsdk-user-email-address');
    if (s == null) throw new Error('should not happen');
    return s;
  }

  getUserContact(): Contact {
    return {
      emailAddress: this.getUserEmailAddress(),
      name: this.getUserEmailAddress()
    };
  }

  getAccountSwitcherContactList(): Contact[] {
    throw new Error('not implemented yet');
  }

  addNavItem(appId: string, navItemDescriptor: Object): Object {
    console.log('addNavItem not implemented');
    const obj = {
      getEventStream: _.constant(Kefir.never()),
      addNavItem: () => obj
    };
    return obj;
  }

  getSentMailNativeNavItem(): Promise<Object> {
    // stub, never resolve
    // console.log('getSentMailNativeNavItem not implemented');
    return new Promise((resolve, reject) => {});
  }

  createLink(routeID: string, params: ?RouteParams): any {
    throw new Error("Not implemented");
  }

  goto(routeID: string, params: ?RouteParams): void {
    if (!this._customRouteIDs.has(routeID)) {
      throw new Error(`Invalid routeID: ${routeID}`);
    }
    document.location.hash = populateRouteID(routeID, params);
  }

  addCustomRouteID(routeID: string): () => void {
    this._customRouteIDs.add(routeID);
    this._pageCommunicator.registerAllowedHashLinkStartTerm(routeID.split('/')[0]);
    return () => {
      this._customRouteIDs.delete(routeID);
    };
  }

  addCustomListRouteID(routeID: string, handler: Function): () => void {
    console.log('addCustomListRouteID not implemented');
    return _.noop;
  }

  showCustomRouteView(el: HTMLElement): void {
    let customViewBase = document.querySelector('body > .inboxsdk__custom_view');
    if (!customViewBase) {
      const _customViewBase = customViewBase = document.createElement('div');
      customViewBase.className = 'inboxsdk__custom_view';

      const {chat, nav} = getSidebarClassnames();

      setCss('custom_view_base_margins', `
        .inboxsdk__custom_view.${nav||'nav_sidebar'} >
        .${idMap('custom_view_container')}.${idMap('custom_view_min_margins')} {
          margin-left: 232px;
        }
        .inboxsdk__custom_view.${chat||'chat_sidebar'} >
        .${idMap('custom_view_container')}.${idMap('custom_view_min_margins')} {
          margin-right: 232px;
        }
      `);

      // Mirror the nav and chat sidebar classnames onto the inboxsdk__custom_view
      // element so that if the custom_view_container element also has the centerList
      // classname, then Inbox's margin rules for centerList will apply to it.
      const main = querySelector(document, 'body > div[class][id][jsaction][jslog]');
      makeMutationObserverChunkedStream(main, {attributes: true, attributeFilter: ['class']})
        .toProperty(() => null)
        .onValue(() => {
          [chat, nav].filter(Boolean).forEach(className => {
            if (main.classList.contains(className)) {
              _customViewBase.classList.add(className);
            } else {
              _customViewBase.classList.remove(className);
            }
          });
        });

      ((document.body:any):HTMLElement).appendChild(customViewBase);
    }

    customViewBase.innerHTML = '';
    customViewBase.appendChild(el);
    customViewBase.style.display = '';

    ((document.body:any):HTMLElement).classList.add('inboxsdk__custom_view_active');

    const main = document.querySelector('[id][jsaction] > div[token][class]');
    if (main) {
      main.style.display = 'none';
    }
  }

  showNativeRouteView(): void {
    ((document.body:any):HTMLElement).classList.remove('inboxsdk__custom_view_active');
    const customViewBase = document.querySelector('body > .inboxsdk__custom_view');
    if (customViewBase) {
      customViewBase.style.display = 'none';
      customViewBase.innerHTML = '';
    }
    const main = document.querySelector('[id][jsaction] > div[token][class]');
    if (main) {
      main.style.display = '';
    }
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

  addToolbarButtonForApp(buttonDescriptor: Kefir.Observable<Object>): Promise<InboxAppToolbarButtonView> {
    const view = new InboxAppToolbarButtonView(
      buttonDescriptor,
      this._page.tree.getAllByTag('appToolbarLocation'),
      this._page.tree.getAllByTag('searchBar')
    );
    return view.waitForReady();
  }

  isRunningInPageContext(): boolean {
    return !!(global.gbar && global.gbar._CONFIG);
  }

  showAppIdWarning() {
    const topDiv = document.createElement('div');
    topDiv.className = 'inboxsdk__appid_warning';
    topDiv.innerHTML = `
  <button type="button" value="" title="Close" class="inboxsdk__close_button"></button>
  <div class="inboxsdk__appid_warning_main">
    <div class="topline">InboxSDK Developer Warning: Invalid AppId</div>
    <div>You've loaded the InboxSDK with an unregistered appId. Registration is free but necessary to load the SDK.</div>
  </div>
  <a class="inboxsdk__appid_register" target="_blank" href="https://www.inboxsdk.com/register">Register Your App</a>
  `;

    ((document.body:any):HTMLElement).insertBefore(topDiv, ((document.body:any):HTMLElement).firstChild);

    const closeBtn = topDiv.querySelector('.inboxsdk__close_button');
    if (!closeBtn) throw new Error('Should not happen');
    closeBtn.addEventListener('click', function(e: MouseEvent) {
      topDiv.remove();
    });
  }

  openDraftByMessageID(messageID: string): void {
    throw new Error("Not implemented");
  }

  createMoleViewDriver(options: Object): Object {
    throw new Error("Not implemented");
  }

  createModalViewDriver(options: Object): InboxModalView {
    return new InboxModalView(options);
  }

  createTopMessageBarDriver(options: Object): Object {
    throw new Error("Not implemented");
  }

  createDrawerViewDriver(options) {
    const drawerView = new InboxDrawerView(options);
    // TODO if a native drawer was already open, we should close the native
    // drawer istead of the new one.

    // If a nativeDrawer is opened while the new SDK drawer is open, then close
    // the SDK drawer.
    const sub = this._page.tree.getAllByTag('nativeDrawer').subscribe(changes => {
      for (let change of changes) {
        if (change.type === 'add') {
          drawerView.close();
          break;
        }
      }
    });
    drawerView.getClosingStream().take(1).onValue(() => {
      sub.unsubscribe();
    });

    return drawerView;
  }

  createBackdrop(zIndex, target) {
    return new InboxBackdrop(zIndex, target);
  }

  closeOpenThread() {
    simulateKey((document.body:any), 27, 27);
  }
}

export default defn(module, InboxDriver);
