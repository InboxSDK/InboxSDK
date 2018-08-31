/* @flow */

import once from 'lodash/once';
import constant from 'lodash/constant';
import includes from 'lodash/includes';
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
import getInboxMessageIdForInboxThreadId from './getInboxMessageIdForInboxThreadId';
import getGmailMessageIdForSyncMessageId from '../../driver-common/getGmailMessageIdForSyncMessageId';
import getThreadIdFromMessageId from '../../driver-common/getThreadIdFromMessageId';
import gmailAjax from '../../driver-common/gmailAjax';
import getAccountUrlPart from '../../driver-common/getAccountUrlPart';
import simulateKey from '../../lib/dom/simulate-key';
import setCss from '../../lib/dom/set-css';
import querySelector from '../../lib/dom/querySelectorOrFail';
import customStyle from './custom-style';
import censorHTMLstring from '../../../common/censor-html-string';
import censorHTMLtree from '../../../common/censor-html-tree';
import type KeyboardShortcutHandle from '../../views/keyboard-shortcut-handle';
import getComposeViewDriverLiveSet from './getComposeViewDriverLiveSet';
import addNavItem from './addNavItem';

import type {ItemWithLifetime, ElementWithLifetime} from '../../lib/dom/make-element-child-stream';
import querySelectorOne from '../../lib/dom/querySelectorOne';
import idMap from '../../lib/idMap';
import makeMutationObserverChunkedStream from '../../lib/dom/make-mutation-observer-chunked-stream';
import getSidebarClassnames from './getSidebarClassnames';
import InboxButterBarDriver from './inbox-butter-bar-driver';
import createLink from './createLink';
import gotoView from './gotoView';

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
import InboxMoleViewDriver from './views/InboxMoleViewDriver';

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
  _navMenuContainer: ?HTMLElement;
  _threadIdStats: {
    threadRows: {
      totalThreads: Set<string>;
      totalCalls: number;
      threadsWithoutGmailId: Set<string>;
      callsWithoutGmailId: number;
      threadsWithFetch: number;
    }
  };

  getGmailMessageIdForSyncMessageId: (inboxMessageId: string) => Promise<string>;
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

    this._setupThreadIdStats();

    {
      if (global.localStorage) {
        // We used to not always identify the ids of messages correctly, so we
        // just drop the old cache and use a new one.
        global.localStorage.removeItem('inboxsdk__cached_gmail_and_inbox_message_ids');
      }
      const gmailMessageIdForInboxMessageIdCache = new BiMapCache({
        key: 'inboxsdk__cached_gmail_and_inbox_message_ids_2',
        getAfromB: (inboxMessageId: string) => getGmailMessageIdForSyncMessageId(this, inboxMessageId),
        getBfromA() {
          throw new Error('should not happen');
        }
      });
      this.getGmailMessageIdForSyncMessageId = inboxMessageId =>
        gmailMessageIdForInboxMessageIdCache.getAfromB(inboxMessageId);
    }

    {
      const inboxMessageIdForInboxThreadIdCache = new BiMapCache({
        key: 'inboxsdk__cached_inbox_message_and_inbox_thread_ids',
        getAfromB: (inboxThreadId: string) => {
          this._threadIdStats.threadRows.threadsWithFetch += 1;
          return getInboxMessageIdForInboxThreadId(this, inboxThreadId);
        },
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

    this._threadViewDriverLiveSet = lsFlatMap(
      this._page.tree.getAllByTag('thread'),
      node => {
        const el = node.getValue();
        let parsed = threadParser(el);
        if (parsed.errors.length) {
          this._logger.errorSite(new Error('parse errors (thread)'), {
            score: parsed.score,
            errors: parsed.errors,
            html: censorHTMLtree(el)
          });
        }
        return new LiveSet({
          read() {
            throw new Error();
          },
          listen: (setValues, controller) => {
            setValues(new Set());
            const unsub = kefirStopper();

            // If the InboxThreadView is destroyed before the element is removed,
            // then make a new InboxThreadView out of the same element.
            const newView = firstRun => {
              if (!firstRun) {
                parsed = threadParser(el);
                if (parsed.errors.length > 0) {
                  this._logger.errorSite(new Error('thread reparse errors'), {
                    score: parsed.score,
                    errors: parsed.errors,
                    html: censorHTMLtree(el)
                  });
                }
              }
              const view = new InboxThreadView(el, this, parsed);
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

  _setupThreadIdStats() {
    this._resetThreadIdStats();

    setInterval(() => {
      if (this._threadIdStats.threadRows.totalCalls === 0) return;

      const {threadRows} = this._threadIdStats;
      const stats = {};
      stats.threadRows = Object.assign({}, threadRows, {
        totalThreads: threadRows.totalThreads.size,
        threadsWithoutGmailId: threadRows.threadsWithoutGmailId.size
      });

      this._logger.eventSdkPassive('inboxThreadIdStats', stats);

      this._resetThreadIdStats();
    }, 1000 * 60 * 60);
  }

  _resetThreadIdStats() {
    this._threadIdStats = {
      threadRows: {
        totalThreads: new Set(),
        totalCalls: 0,
        threadsWithoutGmailId: new Set(),
        callsWithoutGmailId: 0,
        threadsWithFetch: 0
      }
    };
  }

  trackThreadRowIdCall(hasGmailId: boolean, inboxThreadId: string) {
    this._threadIdStats.threadRows.totalCalls += 1;
    this._threadIdStats.threadRows.totalThreads.add(inboxThreadId);

    if (!hasGmailId) {
      this._threadIdStats.threadRows.callsWithoutGmailId += 1;
      this._threadIdStats.threadRows.threadsWithoutGmailId.add(inboxThreadId);
    }
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

  openNewComposeViewDriver(): Promise<InboxComposeView> {
    const composeViewDriverPromise = this.getNextComposeViewDriver();
    const fabButton = querySelectorOne((document.body:any), 'nav[role=banner] ~ div[aria-expanded] button:not([tabindex="-1"])');
    fabButton.click();
    return composeViewDriverPromise;
  }

  getNextComposeViewDriver(timeout = 10 * 1000): Promise<InboxComposeView> {
    const s = Kefir.stream(em => {
      const subscription = this._composeViewDriverLiveSet.subscribe({
        next: changes => {
          const newComposeChange = changes.filter(change => change.type === 'add')[0];
          if (newComposeChange) {
            // make flow happy
            if (newComposeChange.type !== 'add') throw new Error('should not happen');

            em.value(newComposeChange.value);
          }
        },
        complete: em.end
      });
      return () => subscription.unsubscribe();
    });

    return s
      .merge(
        Kefir.later(timeout, new Error('Reached timeout while waiting for getNextComposeViewDriver'))
      )
      .beforeEnd(() => new Error('Driver was shut down before a new compose was found'))
      .flatMap(x => x instanceof Error ? Kefir.constantError(x) : Kefir.constant(x))
      .take(1)
      .takeErrors(1)
      .toPromise();
  }

  activateShortcut(keyboardShortcutHandle: KeyboardShortcutHandle, appName: ?string, appIconUrl: ?string): void {
    console.warn('activateShortcut not implemented'); //eslint-disable-line no-console
  }

  getGmailActionToken = once(async () => {
    const response = await gmailAjax({
      url: `https://mail.google.com/mail${getAccountUrlPart()}/`,
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

  isConversationViewDisabled(): Promise<boolean> {
    return Promise.resolve(false);
  }

  isUsingMaterialUI(): boolean {
    return false;
  }

  getUserLanguage(): string {
    return this._pageCommunicator.getUserLanguage();
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
    const unregister = kefirStopper();

    const removeButtonOnUnregister = button => {
      unregister.takeUntilBy(button.getStopper()).onValue(() => {
        button.destroy();
      });
    };

    const toolbarViewSub = toValueObservable(this._toolbarViewDriverLiveSet).subscribe(({value: inboxToolbarView}: {value: InboxToolbarView}) => {
      if (inboxToolbarView.isForThread()) {
        if (!options.positions || includes(options.positions, 'THREAD')) {
          if (options.threadSection === 'OTHER') {
            console.warn('registerThreadButton does not support OTHER section items in Inbox yet.'); //eslint-disable-line no-console
            return;
          }
          removeButtonOnUnregister(inboxToolbarView.addButton({
            ...options,
            onClick: event => {
              options.onClick({
                position: 'THREAD',
                dropdown: event.dropdown,
                selectedThreadViewDrivers: [inboxToolbarView.getThreadViewDriver()],
                selectedThreadRowViewDrivers: []
              });
            }
          }));
        }
      } else if (inboxToolbarView.isForRowList()) {
        if (!options.positions || includes(options.positions, 'LIST')) {
          if (options.listSection === 'OTHER') {
            console.warn('registerThreadButton does not support OTHER section items in Inbox yet.'); //eslint-disable-line no-console
            return;
          }
          removeButtonOnUnregister(inboxToolbarView.addButton({
            ...options,
            onClick: event => {
              options.onClick({
                position: 'LIST',
                dropdown: event.dropdown,
                selectedThreadViewDrivers: [],
                selectedThreadRowViewDrivers: this.getSelectedThreadRowViewDrivers()
              });
            }
          }));
        }
      }
    });
    unregister.onValue(() => {
      toolbarViewSub.unsubscribe();
    });

    if (!options.positions || includes(options.positions, 'ROW')) {
      const threadRowViewSub = toValueObservable(this._threadRowViewDriverLiveSet).subscribe(({value: inboxThreadRowView}: {value: InboxThreadRowView}) => {
        removeButtonOnUnregister(inboxThreadRowView.addToolbarButton({
          ...options,
          onClick: event => {
            options.onClick({
              position: 'ROW',
              dropdown: event.dropdown,
              selectedThreadViewDrivers: [],
              selectedThreadRowViewDrivers: [inboxThreadRowView]
            });
          }
        }));
      });
      unregister.onValue(() => {
        threadRowViewSub.unsubscribe();
      });
    }

    return () => {
      unregister.destroy();
    };
  }

  getSelectedThreadRowViewDrivers(): Array<InboxThreadRowView> {
    return Array.from(this.getThreadRowViewDriverLiveSet().values())
      .filter(threadRowViewDriver => threadRowViewDriver.isSelected());
  }

  addNavItem(appId: string, navItemDescriptor: Kefir.Observable<Object>): Object {
    if (!this._navMenuContainer) {
      this._navMenuContainer = document.createElement('div');
      this._navMenuContainer.classList.add('inboxsdk__navItem_appContainer');
    }

    return addNavItem(
      navItemDescriptor,
      this._page.tree.getAllByTag('leftNav'),
      (this._navMenuContainer: any)
    );
  }

  getSentMailNativeNavItem(): Promise<Object> {
    // stub, never resolve
    // console.log('getSentMailNativeNavItem not implemented');
    return new Promise((resolve, reject) => {});
  }

  createLink(routeID: string, params: ?RouteParams): string {
    return createLink(this, routeID, params);
  }

  async goto(routeID: string, params: ?RouteParams): Promise<void> {
    gotoView(this, routeID, params);
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

  addGlobalSidebarContentPanel(buttonDescriptor: Kefir.Observable<Object>): Promise<?Object> {
    // stub
    return Promise.resolve(null);
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

  createMoleViewDriver(options: Object): InboxMoleViewDriver {
    return new InboxMoleViewDriver(options, this);
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
    Kefir.fromESObservable((this._page.tree.getAllByTag('nativeDrawer'): any))
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
