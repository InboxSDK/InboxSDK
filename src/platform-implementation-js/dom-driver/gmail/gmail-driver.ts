import type LiveSet from 'live-set';
import toValueObservable from 'live-set/toValueObservable';
import t from 'transducers.js';
import * as Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import kefirBus from 'kefir-bus';
import type { Bus } from 'kefir-bus';
import type { TagTree } from 'tag-tree';
import type PageParserTree from 'page-parser-tree';
import includes from 'lodash/includes';

import get from '../../../common/get-or-fail';
import showAppIdWarning from './gmail-driver/show-app-id-warning';
import makePageParserTree from './makePageParserTree';

import GmailElementGetter from './gmail-element-getter';
import makeXhrInterceptor from './make-xhr-interceptor';
import GmailBackdrop from './views/gmail-backdrop';
import type GmailThreadRowView from './views/gmail-thread-row-view';
import type GmailAppToolbarButtonView from './views/gmail-app-toolbar-button-view';

import { removeAllThreadRowUnclaimedModifications } from './views/gmail-thread-row-view';

import GmailTopMessageBarDriver from './widgets/gmail-top-message-bar-driver';
import GmailModalViewDriver from './widgets/gmail-modal-view-driver';
import GmailMoleViewDriver, {
  type MoleOptions,
} from './widgets/gmail-mole-view-driver';
import InboxDrawerView from '../inbox/views/inbox-drawer-view';
import GmailRouteProcessor from './views/gmail-route-view/gmail-route-processor';
import KeyboardShortcutHelpModifier from './gmail-driver/keyboard-shortcut-help-modifier';
import openDraftByMessageID from './gmail-driver/open-draft-by-message-id';
import UserInfo from './gmail-driver/user-info';
import GmailButterBarDriver from './gmail-butter-bar-driver';
import trackGmailStyles from './gmail-driver/track-gmail-styles';
import temporaryTrackDownloadUrlValidity from './gmail-driver/temporary-track-download-url-validity';
import getGmailThreadIdForRfcMessageId from '../../driver-common/getGmailThreadIdForRfcMessageId';
import getRfcMessageIdForGmailThreadId from './gmail-driver/get-rfc-message-id-for-gmail-thread-id';
import getGmailMessageIdForSyncMessageId from '../../driver-common/getGmailMessageIdForSyncMessageId';
import BiMapCache from 'bimapcache';
import type KeyboardShortcutHandle from '../../views/keyboard-shortcut-handle';
import getDraftIDForMessageID from './gmail-driver/get-draft-id-for-message-id';
import type { GetDraftIdResult } from './gmail-driver/get-draft-id-for-message-id';
import addNavItem from './gmail-driver/add-nav-item';
import { addAppMenuItem } from './gmail-driver/add-app-menu-item';
import addSupportItem from './gmail-driver/add-support-item';
import gotoView from './gmail-driver/goto-view';
import showCustomThreadList from './gmail-driver/show-custom-thread-list';
import showCustomRouteView from './gmail-driver/show-custom-route-view';
import showNativeRouteView from './gmail-driver/show-native-route-view';
import registerSearchSuggestionsProvider from './gmail-driver/register-search-suggestions-provider';
import setupComposeViewDriverStream from './gmail-driver/setup-compose-view-driver-stream';
import trackEvents from './gmail-driver/track-events';
import gmailLoadEvent from './gmail-driver/gmail-load-event';
import ThreadRowIdentifier from './gmail-driver/thread-row-identifier';
import overrideGmailBackButton from './gmail-driver/override-gmail-back-button';
import addToolbarButtonForApp from './gmail-driver/add-toolbar-button-for-app';
import setupRouteViewDriverStream from './gmail-driver/setup-route-view-driver-stream';
import getNativeNavItem from './gmail-driver/get-native-nav-item';
import createLink from './gmail-driver/create-link';
import registerSearchQueryRewriter from './gmail-driver/register-search-query-rewriter';
import openComposeWindow from './gmail-driver/open-compose-window';
import GmailAppSidebarView from './views/gmail-app-sidebar-view';
import suppressAddon from './gmail-driver/suppressAddon';

import getSyncThreadFromSyncThreadId from './gmail-driver/getSyncThreadFromSyncThreadId';
import getSyncThreadForOldGmailThreadId from './gmail-driver/getSyncThreadForOldGmailThreadId';

import toItemWithLifetimeStream from '../../lib/toItemWithLifetimeStream';
import toLiveSet from '../../lib/toLiveSet';

import waitFor from '../../lib/stream-wait-for';

import type Logger from '../../lib/logger';
import type PageCommunicator from './gmail-page-communicator';
import type { RouteParams } from '../../namespaces/router';
import type ButterBar from '../../namespaces/butter-bar';
import type { DrawerViewOptions } from '../../driver-interfaces/driver';
import type GmailComposeView from './views/gmail-compose-view';
import type GmailMessageView from './views/gmail-message-view';
import type GmailThreadView from './views/gmail-thread-view';
import type GmailToolbarView from './views/gmail-toolbar-view';
import type GmailRowListView from './views/gmail-row-list-view';
import type GmailRouteView from './views/gmail-route-view/gmail-route-view';
import type GmailSupportItemView from './views/gmail-support-item-view';
import type { SupportItemDescriptor } from './views/gmail-support-item-view';
import type { PiOpts, EnvData } from '../../platform-implementation';
import type NativeGmailNavItemView from './views/native-gmail-nav-item-view';
import type { AppMenuItemDescriptor } from '../../namespaces/app-menu';

import type ContentPanelViewDriver from '../../driver-common/sidebar/ContentPanelViewDriver';
import GmailNavItemView, {
  type NavItemDescriptor,
} from './views/gmail-nav-item-view';
import { Contact } from '../../../inboxsdk';
import GmailAttachmentCardView from './views/gmail-attachment-card-view';
import type { PersonDetails } from '../../namespaces/user';
import getPersonDetails from './gmail-driver/getPersonDetails';
import { type ContentPanelDescriptor } from '../../driver-common/sidebar/ContentPanelViewDriver';

/**
 * @internal
 */
class GmailDriver {
  #appId: string;
  #logger: Logger;
  #opts: PiOpts;
  #envData: EnvData;
  #customRouteIDs: Set<string> = new Set();
  #customListRouteIDs: Map<string, Function> = new Map();
  #customListSearchStringsToRouteIds: Map<string, string> = new Map();
  #messageIDsToThreadIDs: Map<string, string> = new Map();
  #threadRowIdentifier!: ThreadRowIdentifier;
  #gmailRouteProcessor: GmailRouteProcessor;
  #keyboardShortcutHelpModifier: KeyboardShortcutHelpModifier;
  onready!: Promise<void>;
  #page: PageParserTree;
  #pageCommunicator!: PageCommunicator;
  #pageCommunicatorPromise!: Promise<PageCommunicator>;
  #butterBar: ButterBar | null | undefined;
  #butterBarDriver: GmailButterBarDriver;
  #routeViewDriverStream!: Kefir.Observable<GmailRouteView, unknown>;
  #rowListViewDriverStream!: Kefir.Observable<any, unknown>;
  #threadRowViewDriverKefirStream!: Kefir.Observable<any, unknown>;
  #threadViewDriverLiveSet!: LiveSet<GmailThreadView>;
  #toolbarViewDriverLiveSet!: LiveSet<GmailToolbarView>;
  #composeViewDriverStream!: Kefir.Observable<GmailComposeView, unknown>;
  #xhrInterceptorStream!: Kefir.Observable<any, unknown>;
  #messageViewDriverStream!: Kefir.Observable<GmailMessageView, unknown>;
  #stopper = kefirStopper();
  #navMarkerHiddenChanged: Bus<null, unknown> = kefirBus();
  #addonSidebarHiddenChanged: Bus<null, unknown> = kefirBus();
  #userInfo!: UserInfo;
  #timestampAccountSwitcherReady!: number | null | undefined;
  #timestampGlobalsFound!: number | null | undefined;
  #timestampOnready: number | null | undefined;
  #lastCustomThreadListActivity!:
    | { customRouteID: string; timestamp: Date }
    | null
    | undefined;
  #currentRouteViewDriver!: GmailRouteView;
  #appSidebarView: GmailAppSidebarView | null | undefined = null;

  getGmailThreadIdForRfcMessageId: (rfcId: string) => Promise<string>;
  getRfcMessageIdForGmailThreadId: (threadId: string) => Promise<string>;
  getSyncThreadIdForOldGmailThreadId: (threadId: string) => Promise<string>;
  getOldGmailThreadIdFromSyncThreadId: (threadId: string) => Promise<string>;
  removeCachedOldGmailThreadIdFromSyncThreadId: (threadId: string) => void;

  getGmailMessageIdForSyncDraftId: (syncDraftId: string) => Promise<string>;
  getGmailMessageIdForSyncMessageId: (syncMessageId: string) => Promise<string>;
  removeCachedGmailMessageIdForSyncMessageId: (syncMessageID: string) => void;

  constructor(
    appId: string,
    LOADER_VERSION: string,
    IMPL_VERSION: string,
    logger: Logger,
    opts: PiOpts,
    envData: EnvData,
  ) {
    this.#appId = appId;
    this.#logger = logger;
    this.#opts = opts;
    this.#envData = envData;
    this.#page = makePageParserTree(this, document);
    this.#stopper.onValue(() => this.#page.dump());

    // Manages the mapping between RFC Message Ids and Gmail Message Ids. Caches to
    // localStorage. Used for custom thread lists.
    {
      const rfcIdCache = new BiMapCache({
        key: 'inboxsdk__cached_thread_ids',
        getAfromB: (gmailThreadId) =>
          getRfcMessageIdForGmailThreadId(this, gmailThreadId),
        getBfromA: (rfcMessageId) =>
          getGmailThreadIdForRfcMessageId(this, rfcMessageId),
      });
      this.getGmailThreadIdForRfcMessageId = (rfcMessageId) =>
        rfcIdCache.getBfromA(rfcMessageId);
      this.getRfcMessageIdForGmailThreadId = (gmailThreadId) =>
        rfcIdCache.getAfromB(gmailThreadId);
    }

    // Manages mapping between old hex thread ids and new sync based thread ids
    {
      const syncThreadIdToOldGmailThreadIdCache = new BiMapCache({
        key: 'inboxsdk__cached_sync_thread_id_old_gmail_thread_id',
        getAfromB: (oldGmailThreadId: string) => {
          return getSyncThreadForOldGmailThreadId(this, oldGmailThreadId).then(
            ({ syncThreadID }) => syncThreadID,
          );
        },
        getBfromA: (syncThreadID: string) => {
          return getSyncThreadFromSyncThreadId(this, syncThreadID).then(
            (syncThread) => {
              if (syncThread) return syncThread.oldGmailThreadID;
              else throw new Error('syncThread not found');
            },
          );
        },
      });
      this.getSyncThreadIdForOldGmailThreadId = (oldGmailThreadId) =>
        syncThreadIdToOldGmailThreadIdCache.getAfromB(oldGmailThreadId);

      this.getOldGmailThreadIdFromSyncThreadId = (syncThreadId) =>
        syncThreadIdToOldGmailThreadIdCache.getBfromA(syncThreadId);

      this.removeCachedOldGmailThreadIdFromSyncThreadId = (syncThreadId) =>
        syncThreadIdToOldGmailThreadIdCache.removeAfromCache(syncThreadId);
    }

    // mapping between sync message ids and old message ids
    {
      const gmailMessageIdForSyncMessageIdCache = new BiMapCache({
        key: 'inboxsdk__cached_gmail_and_inbox_message_ids_3',
        getAfromB: (sync: string) =>
          getGmailMessageIdForSyncMessageId(this, sync),
        getBfromA() {
          throw new Error('should not happen');
        },
      });
      this.getGmailMessageIdForSyncMessageId = (syncMessageId) =>
        gmailMessageIdForSyncMessageIdCache.getAfromB(syncMessageId);
      this.removeCachedGmailMessageIdForSyncMessageId = (syncMessageId) =>
        gmailMessageIdForSyncMessageIdCache.removeBfromCache(syncMessageId);

      // It's important that this doesn't use the same cache for looking up
      // sync message IDs, because the legacy ID of a draft changes when it's
      // sent. It doesn't really need to be cached so it's not here.
      this.getGmailMessageIdForSyncDraftId = (syncDraftId) =>
        getGmailMessageIdForSyncMessageId(this, syncDraftId);
    }

    this.#gmailRouteProcessor = new GmailRouteProcessor();
    this.#keyboardShortcutHelpModifier = new KeyboardShortcutHelpModifier();
    this.#butterBarDriver = new GmailButterBarDriver();

    Kefir.later(45 * 1000, undefined)
      .takeUntilBy(
        toItemWithLifetimeStream(this.#page.tree.getAllByTag('supportMenu')),
      )
      .onValue(() => {
        this.#logger.errorSite(new Error('Failed to find gmail supportMenu'));
      });

    this.#setupEventStreams();

    this.onready
      .then(() => {
        trackEvents(this);
        gmailLoadEvent(this);
        overrideGmailBackButton(this, this.#gmailRouteProcessor);
        trackGmailStyles();
        temporaryTrackDownloadUrlValidity(this);
        if (opts.suppressAddonTitle != null) {
          suppressAddon(this, opts.suppressAddonTitle);
        }
      })
      .catch((err) => {
        this.#logger.error(err);
      });
  }

  destroy() {
    this.#threadRowViewSelectionChanges.end();
    this.#keyboardShortcutHelpModifier.destroy();
    this.#stopper.destroy();

    removeAllThreadRowUnclaimedModifications();
  }

  getAppId(): string {
    return this.#appId;
  }
  getOpts(): PiOpts {
    return this.#opts;
  }
  getPageCommunicator(): PageCommunicator {
    return this.#pageCommunicator;
  }
  getPageCommunicatorPromise(): Promise<PageCommunicator> {
    return this.#pageCommunicatorPromise;
  }

  get logger() {
    return this.#logger;
  }

  getLogger(): Logger {
    return this.#logger;
  }
  getTagTree(): TagTree<HTMLElement> {
    return this.#page.tree;
  }
  getCustomListSearchStringsToRouteIds(): Map<string, string> {
    return this.#customListSearchStringsToRouteIds;
  }
  getThreadRowIdentifier(): ThreadRowIdentifier {
    return this.#threadRowIdentifier;
  }
  getButterBarDriver(): GmailButterBarDriver {
    return this.#butterBarDriver;
  }
  getButterBar(): ButterBar | null | undefined {
    return this.#butterBar;
  }
  setButterBar(bb: ButterBar) {
    this.#butterBar = bb;
  }
  getCustomRouteIDs(): Set<string> {
    return this.#customRouteIDs;
  }
  getCustomListRouteIDs(): Map<string, Function> {
    return this.#customListRouteIDs;
  }
  getKeyboardShortcutHelpModifier(): KeyboardShortcutHelpModifier {
    return this.#keyboardShortcutHelpModifier;
  }
  getRouteViewDriverStream() {
    return this.#routeViewDriverStream;
  }
  getRowListViewDriverStream() {
    return this.#rowListViewDriverStream;
  }
  getThreadRowViewDriverStream() {
    return this.#threadRowViewDriverKefirStream;
  }
  getThreadViewDriverStream() {
    return toItemWithLifetimeStream(this.#threadViewDriverLiveSet).map(
      ({ el }) => el,
    );
  }
  getAttachmentCardViewDriverStream() {
    return this.#messageViewDriverStream
      .flatMap((messageViewDriver) =>
        messageViewDriver.isLoaded()
          ? Kefir.constant(messageViewDriver)
          : messageViewDriver
              .getEventStream()
              .filter((event: any) => event.eventName === 'messageLoad')
              .map(() => messageViewDriver)
              .take(1),
      )
      .map((messageView) => messageView.getAttachmentCardViewDrivers())
      .flatten<GmailAttachmentCardView>();
  }
  getComposeViewDriverStream() {
    return this.#composeViewDriverStream;
  }
  getXhrInterceptorStream(): Kefir.Observable<Object, unknown> {
    return this.#xhrInterceptorStream;
  }
  getMessageViewDriverStream() {
    return this.#messageViewDriverStream;
  }
  getStopper(): Kefir.Observable<null, never> {
    return this.#stopper;
  }
  getEnvData(): EnvData {
    return this.#envData;
  }

  getTimestampOnReady(): number {
    if (this.#timestampOnready == null) {
      this.#logger.error(new Error('getTimestampOnReady called before ready'));
      return Date.now();
    }
    return this.#timestampOnready;
  }

  // Returns a stream that emits an event once at least `time` milliseconds has
  // passed since the GmailDriver's ready event.
  delayToTimeAfterReady(time: number): Kefir.Observable<void, unknown> {
    const targetTime = this.getTimestampOnReady() + time;
    const timeToWait = Math.max(0, targetTime - Date.now());
    return Kefir.later(timeToWait, undefined);
  }

  getTimings() {
    return {
      piMainStarted: this.#envData.piMainStarted,
      piLoadStarted: this.#envData.piLoadStarted,
      globalsFound: this.#timestampGlobalsFound,
      accountSwitcherReady: this.#timestampAccountSwitcherReady,
      onready: this.#timestampOnready,
    } as const;
  }

  registerThreadButton(options: any) {
    const unregister = kefirStopper();

    const removeButtonOnUnregister = (button: any) => {
      unregister.takeUntilBy(button.getStopper()).onValue(() => {
        button.destroy();
      });
    };

    const toolbarViewSub = toValueObservable(
      this.#toolbarViewDriverLiveSet,
    ).subscribe(({ value: gmailToolbarView }: { value: GmailToolbarView }) => {
      if (gmailToolbarView.isForThread()) {
        if (!options.positions || includes(options.positions, 'THREAD')) {
          removeButtonOnUnregister(
            gmailToolbarView.addButton({
              ...options,
              section: options.threadSection || 'METADATA_STATE',
              onClick: (event: any) => {
                options.onClick({
                  position: 'THREAD',
                  dropdown: event.dropdown,
                  selectedThreadViewDrivers: [
                    gmailToolbarView.getThreadViewDriver(),
                  ],
                  selectedThreadRowViewDrivers: [],
                });
              },
            }),
          );
        }
      } else if (gmailToolbarView.isForRowList()) {
        if (!options.positions || includes(options.positions, 'LIST')) {
          removeButtonOnUnregister(
            gmailToolbarView.addButton({
              ...options,
              section: options.listSection || 'METADATA_STATE',
              onClick: (event: any) => {
                const selectedThreadRowViewDrivers = Array.from(
                  gmailToolbarView.getThreadRowViewDrivers(),
                ).filter((gmailThreadRow) => gmailThreadRow.isSelected());

                options.onClick({
                  position: 'LIST',
                  dropdown: event.dropdown,
                  selectedThreadViewDrivers: [],
                  selectedThreadRowViewDrivers,
                });
              },
            }),
          );
        }
      }
    });
    unregister.onValue(() => {
      toolbarViewSub.unsubscribe();
    });

    if (!options.positions || includes(options.positions, 'ROW')) {
      const perThreadRow = (gmailThreadRow: GmailThreadRowView) => {
        gmailThreadRow.addButton(
          Kefir.constant({
            hasDropdown: options.hasDropdown,
            iconClass: options.iconClass,
            iconUrl: options.iconUrl,
            title: options.title,
            orderHint: options.orderHint,
            onClick: (event: any) => {
              if (!options.onClick) return;
              options.onClick({
                position: 'ROW',
                dropdown: event.dropdown,
                selectedThreadViewDrivers: [],
                selectedThreadRowViewDrivers: [gmailThreadRow],
              });
            },
          }).merge(unregister),
        );
      };

      if (this.#currentRouteViewDriver) {
        this.#currentRouteViewDriver
          .getRowListViews()
          .forEach((gmailRowListView: GmailRowListView) => {
            gmailRowListView.getThreadRowViewDrivers().forEach(perThreadRow);
          });
      }
      const threadRowViewSub = this.#threadRowViewDriverKefirStream.observe({
        value: perThreadRow,
      });
      unregister.onValue(() => {
        threadRowViewSub.unsubscribe();
      });
    }

    return () => {
      unregister.destroy();
    };
  }

  hashChangeNoViewChange(hash: string) {
    if (hash[0] !== '#') {
      throw new Error('bad hash');
    }
    window.history.replaceState(null, null!, hash);
    var hce = new window.HashChangeEvent('hashchange', {
      oldURL:
        document.location.href.replace(/#.*$/, '') + '#inboxsdk-fake-no-vc',
      newURL: document.location.href.replace(/#.*$/, '') + hash,
    });
    window.dispatchEvent(hce);
  }

  addCustomRouteID(routeID: string): () => void {
    this.#customRouteIDs.add(routeID);
    this.#pageCommunicator.registerAllowedHashLinkStartTerm(
      routeID.split('/')[0],
    );
    return () => {
      this.#customRouteIDs.delete(routeID);
    };
  }

  addCustomListRouteID(routeID: string, handler: Function): () => void {
    this.#customListRouteIDs.set(routeID, handler);
    this.#pageCommunicator.registerAllowedHashLinkStartTerm(
      routeID.split('/')[0],
    );
    return () => {
      this.#customListRouteIDs.delete(routeID);
    };
  }

  signalCustomThreadListActivity(customRouteID: string) {
    this.#lastCustomThreadListActivity = {
      customRouteID,
      timestamp: new Date(),
    };
  }

  // Returns the last time a request for a custom thread list search has gone
  // out or we got a response, and the customRouteID for that.
  getLastCustomThreadListActivity():
    | {
        customRouteID: string;
        timestamp: Date;
      }
    | null
    | undefined {
    return this.#lastCustomThreadListActivity;
  }

  showCustomThreadList(
    customRouteID: string,
    onActivate: Function,
    params: Array<string>,
  ) {
    showCustomThreadList(this, customRouteID, onActivate, params);
  }

  showCustomRouteView(element: HTMLElement) {
    showCustomRouteView(this, element);
  }

  showNativeRouteView() {
    showNativeRouteView(this);
  }

  createLink(routeID: string, params: RouteParams | string | null | undefined) {
    return createLink(this.#gmailRouteProcessor, routeID, params);
  }

  goto(
    routeID: string,
    params: RouteParams | string | null | undefined,
  ): Promise<void> {
    return gotoView(this, routeID, params);
  }

  resolveUrlRedirects(url: string): Promise<string> {
    return this.#pageCommunicatorPromise.then((pageCommunicator) =>
      pageCommunicator.resolveUrlRedirects(url),
    );
  }

  registerSearchSuggestionsProvider(handler: Function) {
    registerSearchSuggestionsProvider(this, handler);
  }

  registerSearchQueryRewriter(obj: Object) {
    registerSearchQueryRewriter(this.#pageCommunicator, obj);
  }

  addToolbarButtonForApp(
    buttonDescriptor: any,
  ): Promise<GmailAppToolbarButtonView> {
    return addToolbarButtonForApp(this, buttonDescriptor);
  }

  async openNewComposeViewDriver(): Promise<GmailComposeView> {
    try {
      const composeViewDriverPromise = this.getNextComposeViewDriver();
      await openComposeWindow(this);
      const composeViewDriver = await composeViewDriverPromise;
      return composeViewDriver;
    } catch (err) {
      this.#logger.error(err);
      throw err;
    }
  }

  getNextComposeViewDriver(
    timeout: number = 10 * 1000,
  ): Promise<GmailComposeView> {
    return this.#composeViewDriverStream
      .merge(
        Kefir.later(
          timeout,
          new Error(
            'Reached timeout while waiting for getNextComposeViewDriver',
          ),
        ),
      )
      .beforeEnd(
        () => new Error('Driver was shut down before a new compose was found'),
      )
      .flatMap((x) =>
        x instanceof Error ? Kefir.constantError(x) : Kefir.constant(x),
      )
      .take(1)
      .takeErrors(1)
      .toPromise();
  }

  openDraftByMessageID(messageID: string): Promise<void> {
    return openDraftByMessageID(this, messageID);
  }

  createModalViewDriver(options: any): GmailModalViewDriver {
    return new GmailModalViewDriver(options);
  }

  createMoleViewDriver(options: MoleOptions): GmailMoleViewDriver {
    return new GmailMoleViewDriver(this, options);
  }

  createDrawerViewDriver(options: DrawerViewOptions) {
    return new InboxDrawerView(options);
  }

  createBackdrop(zIndex?: number, target?: HTMLElement) {
    return new GmailBackdrop(zIndex, target);
  }

  addNavItem(
    appId: string,
    navItemDescriptorPropertyStream: Kefir.Observable<
      NavItemDescriptor,
      unknown
    >,
    navMenuInjectionContainer?: HTMLElement,
  ): Promise<GmailNavItemView> {
    return addNavItem(
      this,
      appId,
      navItemDescriptorPropertyStream,
      navMenuInjectionContainer,
    );
  }

  addAppMenuItem(menuItemDescriptor: AppMenuItemDescriptor) {
    return addAppMenuItem(this, menuItemDescriptor);
  }

  addSupportItem(
    supportItemDescriptor: SupportItemDescriptor,
  ): GmailSupportItemView {
    return addSupportItem(this, supportItemDescriptor);
  }

  getSentMailNativeNavItem(): Promise<NativeGmailNavItemView> {
    const p = getNativeNavItem(this, 'sent');
    p.catch((err: unknown) => this.#logger.error(err));
    return p;
  }

  setShowNativeNavMarker(isNative: boolean) {
    this.#navMarkerHiddenChanged.emit(null);
    const leftNavContainerElement =
      GmailElementGetter.getLeftNavContainerElement();
    if (leftNavContainerElement) {
      if (isNative) {
        leftNavContainerElement.classList.remove(
          'inboxsdk__hide_native_marker',
        );
      } else {
        leftNavContainerElement.classList.add('inboxsdk__hide_native_marker');
        this.#stopper.takeUntilBy(this.#navMarkerHiddenChanged).onValue(() => {
          leftNavContainerElement.classList.remove(
            'inboxsdk__hide_native_marker',
          );
        });
      }
    }
  }

  setShowNativeAddonSidebar(isNative: boolean) {
    this.#addonSidebarHiddenChanged.emit(null);
    const addonContainerElement =
      GmailElementGetter.getAddonSidebarContainerElement();
    const mainContentBodyContainerElement =
      GmailElementGetter.getMainContentBodyContainerElement();

    if (addonContainerElement && mainContentBodyContainerElement) {
      const parent = mainContentBodyContainerElement.parentElement;
      if (!parent) return;

      if (isNative) {
        parent.classList.remove('inboxsdk__hide_addon_container');
      } else {
        parent.classList.add('inboxsdk__hide_addon_container');
        this.#stopper
          .takeUntilBy(this.#addonSidebarHiddenChanged)
          .onValue(() => {
            parent.classList.remove('inboxsdk__hide_addon_container');
          });
      }
    }
  }

  async getGmailActionToken(): Promise<string> {
    return this.#pageCommunicator.getActionTokenValue();
  }

  getUserEmailAddress(): string {
    return this.#pageCommunicator.getUserEmailAddress();
  }

  isConversationViewDisabled(): Promise<boolean> {
    return this.#pageCommunicator.isConversationViewDisabled();
  }

  getUserLanguage(): string {
    return this.#pageCommunicator.getUserLanguage();
  }

  getUserContact(): Contact {
    return {
      emailAddress: this.getUserEmailAddress(),
      name: this.#userInfo.getUserName(),
    };
  }

  getAccountSwitcherContactList(): Contact[] {
    return this.#userInfo.getAccountSwitcherContactList();
  }

  activateShortcut(
    keyboardShortcutHandle: KeyboardShortcutHandle,
    appName: string | null | undefined,
    appIconUrl: string | null | undefined,
  ) {
    this.getKeyboardShortcutHelpModifier().set(
      keyboardShortcutHandle,
      this.#appId,
      appName,
      appIconUrl,
    );
    keyboardShortcutHandle.once('destroy', () => {
      this.getKeyboardShortcutHelpModifier().delete(keyboardShortcutHandle);
    });
  }

  #setupEventStreams() {
    var result = makeXhrInterceptor();

    this.#xhrInterceptorStream = result.xhrInterceptStream.takeUntilBy(
      this.#stopper,
    );

    this.#pageCommunicatorPromise = result.pageCommunicatorPromise;

    this.onready = this.#pageCommunicatorPromise.then((pageCommunicator) => {
      this.#timestampGlobalsFound = Date.now();
      this.#pageCommunicator = pageCommunicator;
      this.#logger.setUserEmailAddress(this.getUserEmailAddress());
      this.#userInfo = new UserInfo(this);

      this.#timestampAccountSwitcherReady = Date.now();

      this.#routeViewDriverStream = setupRouteViewDriverStream(
        this.#gmailRouteProcessor,
        this,
      )
        .takeUntilBy(this.#stopper)
        .toProperty();

      this.#routeViewDriverStream.onValue((gmailRouteView) => {
        this.#currentRouteViewDriver = gmailRouteView;
      });

      this.#rowListViewDriverStream = this.#setupRouteSubViewDriver(
        'newGmailRowListView',
      ).takeUntilBy(this.#stopper);

      this.#setupThreadRowViewDriverKefirStream();
      this.#threadViewDriverLiveSet = toLiveSet(
        this.#setupRouteSubViewDriver('newGmailThreadView')
          .takeUntilBy(this.#stopper)
          .flatMap((gmailThreadView) =>
            gmailThreadView.getReadyStream().map(() => gmailThreadView),
          )
          .map((gmailThreadView: any) => ({
            el: gmailThreadView,
            removalStream: gmailThreadView.getStopper(),
          })),
      );

      this.#setupToolbarViewDriverStream();
      this.#setupMessageViewDriverStream();
      this.#setupComposeViewDriverStream();

      this.#threadRowIdentifier = new ThreadRowIdentifier(this);

      this.#timestampOnready = Date.now();
    });
  }

  #setupComposeViewDriverStream() {
    this.#composeViewDriverStream = setupComposeViewDriverStream(
      this,
      this.#messageViewDriverStream,
      this.#xhrInterceptorStream,
    ).takeUntilBy(this.#stopper);
  }

  #setupRouteSubViewDriver(viewName: string): Kefir.Observable<any, unknown> {
    return this.#routeViewDriverStream.flatMap((gmailRouteView) => {
      return gmailRouteView
        .getEventStream()
        .filter((event: any) => event.eventName === viewName)
        .map((event: any) => event.view);
    });
  }

  #setupThreadRowViewDriverKefirStream() {
    this.#threadRowViewDriverKefirStream = this.#rowListViewDriverStream
      .flatMap((rowListViewDriver: GmailRowListView) =>
        rowListViewDriver.getRowViewDriverStream(),
      )
      .takeUntilBy(this.#stopper);
  }

  #setupToolbarViewDriverStream() {
    this.#toolbarViewDriverLiveSet = toLiveSet(
      Kefir.merge([
        this.#rowListViewDriverStream.map(
          (gmailRowListView: GmailRowListView) =>
            gmailRowListView.getToolbarView(),
        ),
        this.getThreadViewDriverStream().map((gmailThreadView) =>
          gmailThreadView.getToolbarView(),
        ),
      ])
        .filter(Boolean)
        .flatMap((gmailToolbarView) => gmailToolbarView.waitForReady())
        .map((gmailToolbarView: any) => ({
          el: gmailToolbarView,
          removalStream: gmailToolbarView.getStopper(),
        }))
        .takeUntilBy(this.#stopper),
    );
    this.#toolbarViewDriverLiveSet.subscribe({});
  }

  #setupMessageViewDriverStream() {
    this.#messageViewDriverStream = this.getThreadViewDriverStream()
      .flatMap((gmailThreadView) =>
        gmailThreadView.getMessageViewDriverStream(),
      )
      .takeUntilBy(this.#stopper);
  }

  async addGlobalSidebarContentPanel(
    descriptor: Kefir.Observable<ContentPanelDescriptor, unknown>,
  ): Promise<ContentPanelViewDriver | null | undefined> {
    await this.waitForGlobalSidebarReady()
      .merge(
        this.#stopper.flatMap(() =>
          Kefir.constantError(new Error('Driver instance was destroyed early')),
        ),
      )
      .take(1)
      .takeErrors(1)
      .toPromise();
    const appSidebar = this.getGlobalSidebar();
    return appSidebar.addGlobalSidebarContentPanel(descriptor);
  }

  waitForGlobalSidebarReady(): Kefir.Observable<void, unknown> {
    const condition = () =>
      GmailElementGetter.getCompanionSidebarContentContainerElement() &&
      (GmailElementGetter.getCompanionSidebarIconContainerElement() ||
        GmailElementGetter.getAddonSidebarContainerElement());
    if (condition()) {
      return Kefir.constant(undefined);
    }
    return waitFor(condition).map(() => undefined);
  }

  getGlobalSidebar(): GmailAppSidebarView {
    let appSidebarView = this.#appSidebarView;
    if (!appSidebarView) {
      const companionSidebarContentContainerEl =
        GmailElementGetter.getCompanionSidebarContentContainerElement();
      if (!companionSidebarContentContainerEl)
        throw new Error('did not find companionSidebarContentContainerEl');
      appSidebarView = this.#appSidebarView = new GmailAppSidebarView(
        this,
        companionSidebarContentContainerEl,
      );
    }

    return appSidebarView;
  }

  isRunningInPageContext(): boolean {
    return !!((global as any).GLOBALS && (global as any)._GM_main);
  }

  showAppIdWarning() {
    showAppIdWarning(this);
  }

  createTopMessageBarDriver(
    optionStream: Kefir.Observable<any, unknown>,
  ): GmailTopMessageBarDriver {
    return new GmailTopMessageBarDriver(optionStream);
  }

  associateThreadAndMessageIDs(threadID: string, messageID: string) {
    this.#messageIDsToThreadIDs.set(messageID, threadID);
  }

  getThreadIDForMessageID(messageID: string): string {
    return get(this.#messageIDsToThreadIDs, messageID);
  }

  getDraftIDForMessageID(
    messageID: string,
    skipCache: boolean = false,
  ): Promise<GetDraftIdResult> {
    return getDraftIDForMessageID(this, messageID, skipCache);
  }

  #recentSyncDraftIds = new Map<string, number>();

  reportRecentSyncDraftId(syncDraftId: string) {
    const count: number | null | undefined =
      this.#recentSyncDraftIds.get(syncDraftId);
    const newCount = (count ?? 0) + 1;
    this.#recentSyncDraftIds.set(syncDraftId, newCount);
  }
  reportDraftClosed(syncDraftId: string) {
    Kefir.later(30 * 1000, undefined)
      .takeUntilBy(this.#stopper)
      .onValue(() => {
        const count: number | null | undefined =
          this.#recentSyncDraftIds.get(syncDraftId);
        let newCount;
        if (count == null || count < 1) {
          newCount = 0;
          this.#logger.error(
            new Error('_recentSyncDraftIds count had unexpected value'),
            {
              count,
            },
          );
        } else {
          newCount = count - 1;
        }
        if (newCount === 0) {
          this.#recentSyncDraftIds.delete(syncDraftId);
        } else {
          this.#recentSyncDraftIds.set(syncDraftId, newCount);
        }
      });
  }
  isRecentSyncDraftId(syncMessageId: string): boolean {
    return this.#recentSyncDraftIds.has(syncMessageId);
  }

  #selectedThreadRows = t.mapcat((gmailRowListView: GmailRowListView) =>
    gmailRowListView.getSelectedThreadRowViewDrivers(),
  );
  getSelectedThreadRowViewDrivers(): ReadonlyArray<GmailThreadRowView> {
    if (!this.#currentRouteViewDriver) {
      return [];
    }
    return t.toArray(
      this.#currentRouteViewDriver.getRowListViews(),
      this.#selectedThreadRows,
    );
  }

  #threadRowViewSelectionChanges = kefirBus();

  signalThreadRowViewSelectionChange() {
    this.#threadRowViewSelectionChanges.value(undefined);
  }

  registerThreadRowViewSelectionHandler(handler: () => any): () => void {
    this.#threadRowViewSelectionChanges.onValue(handler);
    return () => {
      this.#threadRowViewSelectionChanges.offValue(handler);
    };
  }

  getPersonDetails(emailAddress: string): Promise<PersonDetails | undefined> {
    return getPersonDetails(this, emailAddress);
  }
}

export default GmailDriver;
