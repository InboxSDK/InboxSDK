/* @flow */

import once from 'lodash/once';
import constant from 'lodash/constant';
import autoHtml from 'auto-html';
import RSVP from 'rsvp';

import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type {Bus} from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import type {Stopper} from 'kefir-stopper';
import {defn} from 'ud';

import type {TagTree} from 'tag-tree';
import LiveSet from 'live-set';
import lsFilter from 'live-set/filter';
import lsMerge from 'live-set/merge';
import lsFlatMap from 'live-set/flatMap';
import lsMapWithRemoval from 'live-set/mapWithRemoval';
import toValueObservable from 'live-set/toValueObservable';
import type PageParserTree from 'page-parser-tree';
import makePageParserTree from './makePageParserTree';

import Logger from '../../lib/logger';
import toItemWithLifetimeStream from '../../lib/toItemWithLifetimeStream';
import injectScript from '../../lib/inject-script';
import fromEventTargetCapture from '../../lib/from-event-target-capture';
import BiMapCache from 'bimapcache';
import getGmailMessageIdForInboxMessageId from './getGmailMessageIdForInboxMessageId';
import getInboxMessageIdForInboxThreadId from './getInboxMessageIdForInboxThreadId';
import getThreadIdFromMessageId from '../../driver-common/getThreadIdFromMessageId';
import gmailAjax from '../../driver-common/gmailAjax';
import populateRouteID from '../../lib/populateRouteID';
import simulateKey from '../../lib/dom/simulate-key';
import setCss from '../../lib/dom/set-css';
import querySelector from '../../lib/dom/querySelectorOrFail';
import customStyle from './custom-style';
import censorHTMLstring from '../../../common/censor-html-string';
import censorHTMLtree from '../../../common/censor-html-tree';
import type KeyboardShortcutHandle from '../../views/keyboard-shortcut-handle';
import getComposeViewDriverLiveSet from './getComposeViewDriverLiveSet';

import type {ItemWithLifetime, ElementWithLifetime} from '../../lib/dom/make-element-child-stream';
import querySelectorOne from '../../lib/dom/querySelectorOne';
import idMap from '../../lib/idMap';
import makeMutationObserverChunkedStream from '../../lib/dom/make-mutation-observer-chunked-stream';
import getSidebarClassnames from './getSidebarClassnames';
import InboxButterBarDriver from './inbox-butter-bar-driver';

import threadParser from './detection/thread/parser';
import threadRowParser from './detection/thread-row/parser';
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
import type InboxDummyRouteView from './views/inbox-dummy-route-view';
import type InboxComposeView from './views/inbox-compose-view';
import InboxThreadView from './views/inbox-thread-view';
import InboxThreadRowView from './views/inbox-thread-row-view';
import InboxMessageView from './views/inbox-message-view';
import InboxAttachmentCardView from './views/inbox-attachment-card-view';
import InboxAttachmentOverlayView from './views/inbox-attachment-overlay-view';
import InboxChatSidebarView from './views/inbox-chat-sidebar-view';
import InboxToolbarView from './views/InboxToolbarView';

import InboxAppSidebarView from './views/inbox-app-sidebar-view';

import registerSearchSuggestionsProvider from './registerSearchSuggestionsProvider';

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
  _composeViewDriverLiveSet: LiveSet<InboxComposeView>;
  _threadRowViewDriverLiveSet: LiveSet<InboxThreadRowView>;
  _threadViewDriverLiveSet: LiveSet<InboxThreadView>;
  _messageViewDriverLiveSet: LiveSet<InboxMessageView>;
  _attachmentCardViewDriverLiveSet: LiveSet<InboxAttachmentCardView>;
  _attachmentOverlayViewDriverLiveSet: LiveSet<InboxAttachmentOverlayView>;
  _chatSidebarViewLiveSet: LiveSet<InboxChatSidebarView>;
  _toolbarViewDriverLiveSet: LiveSet<InboxToolbarView>;
  _currentRouteViewDriver: InboxRouteView|InboxDummyRouteView|InboxCustomRouteView;
  _threadViewElements: WeakMap<HTMLElement, InboxThreadView> = new WeakMap();
  _messageViewElements: WeakMap<HTMLElement, InboxMessageView> = new WeakMap();
  _butterBarDriver = new InboxButterBarDriver();
  _butterBar: ButterBar;
  _pageCommunicator: InboxPageCommunicator;
  _lastInteractedAttachmentCardView: ?InboxAttachmentCardView = null;
  _lastInteractedAttachmentCardViewSet: Bus<any> = kefirBus();
  _appSidebarView: ?InboxAppSidebarView = null;
  _customRouteIDs: Set<string> = new Set();

  getGmailMessageIdForInboxMessageId: (inboxMessageId: string) => Promise<string>;
  getInboxMessageIdForInboxThreadId: (inboxThreadId: string) => Promise<string>;
  getThreadIdFromMessageId: (messageId: string) => Promise<string>;

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

    {
      if (global.localStorage) {
        // We used to not always identify the ids of messages correctly, so we
        // just drop the old cache and use a new one.
        global.localStorage.removeItem('inboxsdk__cached_gmail_and_inbox_message_ids');
      }
      const gmailMessageIdForInboxMessageIdCache = new BiMapCache({
        key: 'inboxsdk__cached_gmail_and_inbox_message_ids_2',
        getAfromB: (inboxMessageId: string) => getGmailMessageIdForInboxMessageId(this, inboxMessageId),
        getBfromA() {
          throw new Error('should not happen');
        }
      });
      this.getGmailMessageIdForInboxMessageId = inboxMessageId =>
        gmailMessageIdForInboxMessageIdCache.getAfromB(inboxMessageId);
    }

    {
      const inboxMessageIdForInboxThreadIdCache = new BiMapCache({
        key: 'inboxsdk__cached_inbox_message_and_inbox_thread_ids',
        getAfromB: (inboxThreadId: string) => getInboxMessageIdForInboxThreadId(this, inboxThreadId),
        getBfromA() {
          throw new Error('should not happen');
        }
      });
      this.getInboxMessageIdForInboxThreadId = inboxThreadId =>
        inboxMessageIdForInboxThreadIdCache.getAfromB(inboxThreadId);
    }

    {
      const threadIdFromMessageIdCache = new BiMapCache({
        key: 'inboxsdk__cached_thread_and_message_ids',
        getAfromB: (messageId: string) => getThreadIdFromMessageId(this, messageId),
        getBfromA() {
          throw new Error('should not happen');
        }
      });
      this.getThreadIdFromMessageId = messageId =>
        threadIdFromMessageIdCache.getAfromB(messageId);
    }

    this._threadRowViewDriverLiveSet = lsMapWithRemoval(this._page.tree.getAllByTag('collapsedThreadRow'), (node, removal) => {
      const el = node.getValue();
      const parsed = threadRowParser(el);
      if (parsed.errors.length) {
        this._logger.errorSite(new Error('parse errors (threadRow)'), {
          score: parsed.score,
          errors: parsed.errors,
          html: censorHTMLtree(el)
        });
      }
      const view = new InboxThreadRowView(el, this, parsed);
      removal.then(() => {
        view.destroy();
      });
      return view;
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
        read() {
          throw new Error();
        },
        listen: setValues => {
          const view = new InboxAttachmentOverlayView(this, el, parsed, cardView);
          setValues(new Set([view]));
          return () => {
            view.destroy();
          };
        }
      });
    });
    this._attachmentOverlayViewDriverLiveSet.subscribe({});
    // force activation because nothing outside of the driver is going to
    // subscribe to this, unlike some of the other livesets.

    this._composeViewDriverLiveSet = getComposeViewDriverLiveSet(this, this._page.tree);

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
    // force activation because nothing outside of the driver is going to
    // subscribe to this, unlike some of the other livesets.

    this._routeViewDriverStream = setupRouteViewDriverStream(this);
    this._routeViewDriverStream.takeUntilBy(this._stopper).onValue(routeViewDriver => {
      this._currentRouteViewDriver = routeViewDriver;
    });

    this._rowListViewDriverStream = Kefir.never();

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

    this._toolbarViewDriverLiveSet = lsMerge([
      lsMapWithRemoval(this._page.tree.getAllByTag('listToolBar'), (node, removal) => {
        const el = node.getValue();
        const view = new InboxToolbarView(el, this, null);
        removal.then(() => {
          view.destroy();
        });
        return view;
      }),
      lsMapWithRemoval(this._threadViewDriverLiveSet, (inboxThreadView, removal) => {
        const el = inboxThreadView.getToolbarElement();
        const view = new InboxToolbarView(el, this, inboxThreadView);
        removal.then(() => {
          view.destroy();
        });
        return view;
      })
    ]);
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
  getCurrentRouteViewDriver() {return this._currentRouteViewDriver;}
  getRowListViewDriverStream() {return Kefir.never();}
  getComposeViewDriverLiveSet() {return this._composeViewDriverLiveSet;}
  getComposeViewDriverStream() {
    return toItemWithLifetimeStream(this._composeViewDriverLiveSet).map(({el})=>el);
  }
  getThreadRowViewDriverLiveSet() {
    return this._threadRowViewDriverLiveSet;
  }
  getThreadRowViewDriverStream() {
    return toItemWithLifetimeStream(this._threadRowViewDriverLiveSet).map(({el})=>el);
  }
  getThreadViewDriverStream() {
    return toItemWithLifetimeStream(this._threadViewDriverLiveSet).map(({el})=>el);
  }
  getMessageViewDriverStream() {
    return toItemWithLifetimeStream(this._messageViewDriverLiveSet).map(({el})=>el);
  }
  getAttachmentCardViewDriverStream() {
    return toItemWithLifetimeStream(this._attachmentCardViewDriverLiveSet).map(({el})=>el);
  }
  getToolbarViewDriverStream() {
    return toItemWithLifetimeStream(this._toolbarViewDriverLiveSet).map(({el})=>el);
      // .filter(() => false); // TODO re-enable when threadRowViews are ready
  }
  getButterBarDriver(): Object {return this._butterBarDriver;}
  getButterBar(): ButterBar {return this._butterBar;}
  setButterBar(bb: ButterBar) {this._butterBar = bb;}
  getPageCommunicator(): InboxPageCommunicator {return this._pageCommunicator;}

  getThreadViewElementsMap() {return this._threadViewElements;}
  getMessageViewElementsMap() {return this._messageViewElements;}

  getTagTree(): TagTree<HTMLElement> {return this._page.tree;}

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
    console.warn('activateShortcut not implemented'); //eslint-disable-line no-console
  }

  getGmailActionToken = once(async () => {
    const accountParamMatch = document.location.pathname.match(/(\/u\/\d+)\//i);
    const accountParam = accountParamMatch ? accountParamMatch[1] : '/u/0';
    const response = await gmailAjax({
      url: `https://mail.google.com/mail${accountParam}/`,
      xhrFields: {
        withCredentials: true
      },
      canRetry: true,
    });
    const tokenVarMatch = response.text.match(/var GM_ACTION_TOKEN=("[^"]+")/);
    if (!tokenVarMatch) {
      throw new Error('Could not find GM_ACTION_TOKEN');
    }
    return JSON.parse(tokenVarMatch[1]);
  });

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
    console.log('getAccountSwitcherContactList not implemented'); //eslint-disable-line no-console
    return [this.getUserContact()];
  }

  registerThreadButton(options: Object) {
    const toolbarViewSub = toValueObservable(this._toolbarViewDriverLiveSet).subscribe(({value: inboxToolbarView}: {value: InboxToolbarView}) => {
      if (inboxToolbarView.isForThread()) {
        inboxToolbarView.addButton({
          ...options,
          onClick: event => {
            options.onClick({
              dropdown: event.dropdown,
              selectedThreadViewDrivers: [inboxToolbarView.getThreadViewDriver()],
              selectedThreadRowViewDrivers: []
            });
          }
        });
      } else if (inboxToolbarView.isForRowList()) {
        inboxToolbarView.addButton({
          ...options,
          onClick: event => {
            options.onClick({
              dropdown: event.dropdown,
              selectedThreadViewDrivers: [],
              selectedThreadRowViewDrivers: this.getSelectedThreadRowViewDrivers()
            });
          }
        });
      }
    });

    const threadRowViewSub = toValueObservable(this._threadRowViewDriverLiveSet).subscribe(({value: inboxThreadRowView}: {value: InboxThreadRowView}) => {
      inboxThreadRowView.addToolbarButton({...options, onClick: event => {
        options.onClick({
          dropdown: event.dropdown,
          selectedThreadViewDrivers: [],
          selectedThreadRowViewDrivers: [inboxThreadRowView]
        });
      }});
    });

    return () => {
      toolbarViewSub.unsubscribe();
      threadRowViewSub.unsubscribe();
    };
  }

  getSelectedThreadRowViewDrivers(): Array<InboxThreadRowView> {
    return Array.from(this.getThreadRowViewDriverLiveSet().values())
      .filter(threadRowViewDriver => threadRowViewDriver.isSelected());
  }

  addNavItem(appId: string, navItemDescriptor: Object): Object {
    console.log('addNavItem not implemented'); //eslint-disable-line no-console
    const obj = {
      getEventStream: constant(Kefir.never()),
      addNavItem: () => obj,
      setCollapsed: () => {},
      destroy: () => {}
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
    console.log('addCustomListRouteID not implemented'); //eslint-disable-line no-console
    return () => {};
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

  setShowNativeNavMarker(isNative: boolean) {
    // stub
  }

  setShowNativeAddonSidebar(isNative: boolean) {
    // stub
  }

  registerSearchSuggestionsProvider(handler: Function) {
    registerSearchSuggestionsProvider(this, handler);
  }

  registerSearchQueryRewriter(obj: Object) {
    console.log('registerSearchQueryRewriter not implemented'); //eslint-disable-line no-console
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
    Kefir.fromESObservable(this._page.tree.getAllByTag('nativeDrawer'))
      .takeUntilBy(drawerView.getClosingStream())
      .onValue(changes => {
        for (let change of changes) {
          if (change.type === 'add') {
            drawerView.close();
            break;
          }
        }
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
