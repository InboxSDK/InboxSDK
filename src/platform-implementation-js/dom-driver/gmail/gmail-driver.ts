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
import GmailMoleViewDriver from './widgets/gmail-mole-view-driver';
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
import type { Driver, DrawerViewOptions } from '../../driver-interfaces/driver';
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
import { MoleOptions } from '../../driver-interfaces/mole-view-driver';
import { Contact } from '../../../inboxsdk';
import GmailAttachmentCardView from './views/gmail-attachment-card-view';

class GmailDriver implements Driver {
  _appId: string;
  _logger: Logger;
  _opts: PiOpts;
  _envData: EnvData;
  _customRouteIDs: Set<string> = new Set();
  _customListRouteIDs: Map<string, Function> = new Map();
  _customListSearchStringsToRouteIds: Map<string, string> = new Map();
  _messageIDsToThreadIDs: Map<string, string> = new Map();
  _threadRowIdentifier!: ThreadRowIdentifier;
  _gmailRouteProcessor: GmailRouteProcessor;
  _keyboardShortcutHelpModifier: KeyboardShortcutHelpModifier;
  onready!: Promise<void>;
  _page: PageParserTree;
  _pageCommunicator!: PageCommunicator;
  _pageCommunicatorPromise!: Promise<PageCommunicator>;
  _butterBar: ButterBar | null | undefined;
  _butterBarDriver: GmailButterBarDriver;
  _routeViewDriverStream!: Kefir.Observable<GmailRouteView, unknown>;
  _rowListViewDriverStream!: Kefir.Observable<any, unknown>;
  _threadRowViewDriverKefirStream!: Kefir.Observable<any, unknown>;
  _threadViewDriverLiveSet!: LiveSet<GmailThreadView>;
  _toolbarViewDriverLiveSet!: LiveSet<GmailToolbarView>;
  _composeViewDriverStream!: Kefir.Observable<GmailComposeView, unknown>;
  _xhrInterceptorStream!: Kefir.Observable<any, unknown>;
  _messageViewDriverStream!: Kefir.Observable<GmailMessageView, unknown>;
  _stopper = kefirStopper();
  _navMarkerHiddenChanged: Bus<null, unknown> = kefirBus();
  _addonSidebarHiddenChanged: Bus<null, unknown> = kefirBus();
  _userInfo!: UserInfo;
  _timestampAccountSwitcherReady!: number | null | undefined;
  _timestampGlobalsFound!: number | null | undefined;
  _timestampOnready: number | null | undefined;
  _lastCustomThreadListActivity!:
    | { customRouteID: string; timestamp: Date }
    | null
    | undefined;
  _currentRouteViewDriver!: GmailRouteView;
  _appSidebarView: GmailAppSidebarView | null | undefined = null;

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
    this._appId = appId;
    this._logger = logger;
    this._opts = opts;
    this._envData = envData;
    this._page = makePageParserTree(this, document);
    this._stopper.onValue(() => this._page.dump());

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

    this._gmailRouteProcessor = new GmailRouteProcessor();
    this._keyboardShortcutHelpModifier = new KeyboardShortcutHelpModifier();
    this._butterBarDriver = new GmailButterBarDriver();

    Kefir.later(45 * 1000, undefined)
      .takeUntilBy(
        toItemWithLifetimeStream(this._page.tree.getAllByTag('supportMenu')),
      )
      .onValue(() => {
        this._logger.errorSite(new Error('Failed to find gmail supportMenu'));
      });

    this._setupEventStreams();

    this.onready
      .then(() => {
        trackEvents(this);
        gmailLoadEvent(this);
        overrideGmailBackButton(this, this._gmailRouteProcessor);
        trackGmailStyles();
        temporaryTrackDownloadUrlValidity(this);
        if (opts.suppressAddonTitle != null) {
          suppressAddon(this, opts.suppressAddonTitle);
        }
      })
      .catch((err) => {
        this._logger.error(err);
      });
  }

  destroy() {
    this._threadRowViewSelectionChanges.end();
    this._keyboardShortcutHelpModifier.destroy();
    this._stopper.destroy();

    removeAllThreadRowUnclaimedModifications();
  }

  getAppId(): string {
    return this._appId;
  }
  getOpts(): PiOpts {
    return this._opts;
  }
  getPageCommunicator(): PageCommunicator {
    return this._pageCommunicator;
  }
  getPageCommunicatorPromise(): Promise<PageCommunicator> {
    return this._pageCommunicatorPromise;
  }
  getLogger(): Logger {
    return this._logger;
  }
  getTagTree(): TagTree<HTMLElement> {
    return this._page.tree;
  }
  getCustomListSearchStringsToRouteIds(): Map<string, string> {
    return this._customListSearchStringsToRouteIds;
  }
  getThreadRowIdentifier(): ThreadRowIdentifier {
    return this._threadRowIdentifier;
  }
  getButterBarDriver(): GmailButterBarDriver {
    return this._butterBarDriver;
  }
  getButterBar(): ButterBar | null | undefined {
    return this._butterBar;
  }
  setButterBar(bb: ButterBar) {
    this._butterBar = bb;
  }
  getCustomRouteIDs(): Set<string> {
    return this._customRouteIDs;
  }
  getCustomListRouteIDs(): Map<string, Function> {
    return this._customListRouteIDs;
  }
  getKeyboardShortcutHelpModifier(): KeyboardShortcutHelpModifier {
    return this._keyboardShortcutHelpModifier;
  }
  getRouteViewDriverStream() {
    return this._routeViewDriverStream;
  }
  getRowListViewDriverStream() {
    return this._rowListViewDriverStream;
  }
  getThreadRowViewDriverStream() {
    return this._threadRowViewDriverKefirStream;
  }
  getThreadViewDriverStream() {
    return toItemWithLifetimeStream(this._threadViewDriverLiveSet).map(
      ({ el }) => el,
    );
  }
  getAttachmentCardViewDriverStream() {
    return this._messageViewDriverStream
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
    return this._composeViewDriverStream;
  }
  getXhrInterceptorStream(): Kefir.Observable<Object, unknown> {
    return this._xhrInterceptorStream;
  }
  getMessageViewDriverStream() {
    return this._messageViewDriverStream;
  }
  getStopper(): Kefir.Observable<null, never> {
    return this._stopper;
  }
  getEnvData(): EnvData {
    return this._envData;
  }

  getTimestampOnReady(): number {
    if (this._timestampOnready == null) {
      this._logger.error(new Error('getTimestampOnReady called before ready'));
      return Date.now();
    }
    return this._timestampOnready;
  }

  // Returns a stream that emits an event once at least `time` milliseconds has
  // passed since the GmailDriver's ready event.
  delayToTimeAfterReady(time: number): Kefir.Observable<void, unknown> {
    const targetTime = this.getTimestampOnReady() + time;
    const timeToWait = Math.max(0, targetTime - Date.now());
    return Kefir.later(timeToWait, undefined);
  }

  getTimings(): { [ix: string]: number | null | undefined } {
    return {
      piMainStarted: this._envData.piMainStarted,
      piLoadStarted: this._envData.piLoadStarted,
      globalsFound: this._timestampGlobalsFound,
      accountSwitcherReady: this._timestampAccountSwitcherReady,
      onready: this._timestampOnready,
    };
  }

  registerThreadButton(options: any) {
    const unregister = kefirStopper();

    const removeButtonOnUnregister = (button: any) => {
      unregister.takeUntilBy(button.getStopper()).onValue(() => {
        button.destroy();
      });
    };

    const toolbarViewSub = toValueObservable(
      this._toolbarViewDriverLiveSet,
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

      if (this._currentRouteViewDriver) {
        this._currentRouteViewDriver
          .getRowListViews()
          .forEach((gmailRowListView: GmailRowListView) => {
            gmailRowListView.getThreadRowViewDrivers().forEach(perThreadRow);
          });
      }
      const threadRowViewSub = this._threadRowViewDriverKefirStream.observe({
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
    this._customRouteIDs.add(routeID);
    this._pageCommunicator.registerAllowedHashLinkStartTerm(
      routeID.split('/')[0],
    );
    return () => {
      this._customRouteIDs.delete(routeID);
    };
  }

  addCustomListRouteID(routeID: string, handler: Function): () => void {
    this._customListRouteIDs.set(routeID, handler);
    this._pageCommunicator.registerAllowedHashLinkStartTerm(
      routeID.split('/')[0],
    );
    return () => {
      this._customListRouteIDs.delete(routeID);
    };
  }

  signalCustomThreadListActivity(customRouteID: string) {
    this._lastCustomThreadListActivity = {
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
    return this._lastCustomThreadListActivity;
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
    return createLink(this._gmailRouteProcessor, routeID, params);
  }

  goto(
    routeID: string,
    params: RouteParams | string | null | undefined,
  ): Promise<void> {
    return gotoView(this, routeID, params);
  }

  resolveUrlRedirects(url: string): Promise<string> {
    return this._pageCommunicatorPromise.then((pageCommunicator) =>
      pageCommunicator.resolveUrlRedirects(url),
    );
  }

  registerSearchSuggestionsProvider(handler: Function) {
    registerSearchSuggestionsProvider(this, handler);
  }

  registerSearchQueryRewriter(obj: Object) {
    registerSearchQueryRewriter(this._pageCommunicator, obj);
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
      this._logger.error(err);
      throw err;
    }
  }

  getNextComposeViewDriver(
    timeout: number = 10 * 1000,
  ): Promise<GmailComposeView> {
    return this._composeViewDriverStream
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
    p.catch((err: unknown) => this._logger.error(err));
    return p;
  }

  setShowNativeNavMarker(isNative: boolean) {
    this._navMarkerHiddenChanged.emit(null);
    const leftNavContainerElement =
      GmailElementGetter.getLeftNavContainerElement();
    if (leftNavContainerElement) {
      if (isNative) {
        leftNavContainerElement.classList.remove(
          'inboxsdk__hide_native_marker',
        );
      } else {
        leftNavContainerElement.classList.add('inboxsdk__hide_native_marker');
        this._stopper.takeUntilBy(this._navMarkerHiddenChanged).onValue(() => {
          leftNavContainerElement.classList.remove(
            'inboxsdk__hide_native_marker',
          );
        });
      }
    }
  }

  setShowNativeAddonSidebar(isNative: boolean) {
    this._addonSidebarHiddenChanged.emit(null);
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
        this._stopper
          .takeUntilBy(this._addonSidebarHiddenChanged)
          .onValue(() => {
            parent.classList.remove('inboxsdk__hide_addon_container');
          });
      }
    }
  }

  async getGmailActionToken(): Promise<string> {
    return this._pageCommunicator.getActionTokenValue();
  }

  getUserEmailAddress(): string {
    return this._pageCommunicator.getUserEmailAddress();
  }

  isConversationViewDisabled(): Promise<boolean> {
    return this._pageCommunicator.isConversationViewDisabled();
  }

  getUserLanguage(): string {
    return this._pageCommunicator.getUserLanguage();
  }

  getUserContact(): Contact {
    return {
      emailAddress: this.getUserEmailAddress(),
      name: this._userInfo.getUserName(),
    };
  }

  getAccountSwitcherContactList(): Contact[] {
    return this._userInfo.getAccountSwitcherContactList();
  }

  activateShortcut(
    keyboardShortcutHandle: KeyboardShortcutHandle,
    appName: string | null | undefined,
    appIconUrl: string | null | undefined,
  ) {
    this.getKeyboardShortcutHelpModifier().set(
      keyboardShortcutHandle,
      this._appId,
      appName,
      appIconUrl,
    );
    keyboardShortcutHandle.once('destroy', () => {
      this.getKeyboardShortcutHelpModifier().delete(keyboardShortcutHandle);
    });
  }

  _setupEventStreams() {
    var result = makeXhrInterceptor();

    this._xhrInterceptorStream = result.xhrInterceptStream.takeUntilBy(
      this._stopper,
    );

    this._pageCommunicatorPromise = result.pageCommunicatorPromise;

    this.onready = this._pageCommunicatorPromise.then((pageCommunicator) => {
      this._timestampGlobalsFound = Date.now();
      this._pageCommunicator = pageCommunicator;
      this._logger.setUserEmailAddress(this.getUserEmailAddress());
      this._logger.setIsUsingSyncAPI(pageCommunicator.isUsingSyncAPI());
      this._userInfo = new UserInfo(this);

      this._timestampAccountSwitcherReady = Date.now();

      this._routeViewDriverStream = setupRouteViewDriverStream(
        this._gmailRouteProcessor,
        this,
      )
        .takeUntilBy(this._stopper)
        .toProperty();

      this._routeViewDriverStream.onValue((gmailRouteView) => {
        this._currentRouteViewDriver = gmailRouteView;
      });

      this._rowListViewDriverStream = this._setupRouteSubViewDriver(
        'newGmailRowListView',
      ).takeUntilBy(this._stopper);

      this._setupThreadRowViewDriverKefirStream();
      this._threadViewDriverLiveSet = toLiveSet(
        this._setupRouteSubViewDriver('newGmailThreadView')
          .takeUntilBy(this._stopper)
          .flatMap((gmailThreadView) =>
            gmailThreadView.getReadyStream().map(() => gmailThreadView),
          )
          .map((gmailThreadView: any) => ({
            el: gmailThreadView,
            removalStream: gmailThreadView.getStopper(),
          })),
      );

      this._setupToolbarViewDriverStream();
      this._setupMessageViewDriverStream();
      this._setupComposeViewDriverStream();

      this._threadRowIdentifier = new ThreadRowIdentifier(this);

      this._timestampOnready = Date.now();
    });
  }

  _setupComposeViewDriverStream() {
    this._composeViewDriverStream = setupComposeViewDriverStream(
      this,
      this._messageViewDriverStream,
      this._xhrInterceptorStream,
    ).takeUntilBy(this._stopper);
  }

  _setupRouteSubViewDriver(viewName: string): Kefir.Observable<any, unknown> {
    return this._routeViewDriverStream.flatMap((gmailRouteView) => {
      return gmailRouteView
        .getEventStream()
        .filter((event: any) => event.eventName === viewName)
        .map((event: any) => event.view);
    });
  }

  _setupThreadRowViewDriverKefirStream() {
    this._threadRowViewDriverKefirStream = this._rowListViewDriverStream
      .flatMap((rowListViewDriver: GmailRowListView) =>
        rowListViewDriver.getRowViewDriverStream(),
      )
      .takeUntilBy(this._stopper);
  }

  _setupToolbarViewDriverStream() {
    this._toolbarViewDriverLiveSet = toLiveSet(
      Kefir.merge([
        this._rowListViewDriverStream.map(
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
        .takeUntilBy(this._stopper),
    );
    this._toolbarViewDriverLiveSet.subscribe({});
  }

  _setupMessageViewDriverStream() {
    this._messageViewDriverStream = this.getThreadViewDriverStream()
      .flatMap((gmailThreadView) =>
        gmailThreadView.getMessageViewDriverStream(),
      )
      .takeUntilBy(this._stopper);
  }

  async addGlobalSidebarContentPanel(
    descriptor: Kefir.Observable<Object, unknown>,
  ): Promise<ContentPanelViewDriver | null | undefined> {
    await this.waitForGlobalSidebarReady()
      .merge(
        this._stopper.flatMap(() =>
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
    let appSidebarView = this._appSidebarView;
    if (!appSidebarView) {
      const companionSidebarContentContainerEl =
        GmailElementGetter.getCompanionSidebarContentContainerElement();
      if (!companionSidebarContentContainerEl)
        throw new Error('did not find companionSidebarContentContainerEl');
      appSidebarView = this._appSidebarView = new GmailAppSidebarView(
        this,
        companionSidebarContentContainerEl,
      );
    }

    return appSidebarView;
  }

  isRunningInPageContext(): boolean {
    return !!((global as any).GLOBALS && (global as any)._GM_main);
  }

  isUsingSyncAPI(): boolean {
    return this._pageCommunicator.isUsingSyncAPI();
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
    this._messageIDsToThreadIDs.set(messageID, threadID);
  }

  getThreadIDForMessageID(messageID: string): string {
    return get(this._messageIDsToThreadIDs, messageID);
  }

  getDraftIDForMessageID(
    messageID: string,
    skipCache: boolean = false,
  ): Promise<GetDraftIdResult> {
    return getDraftIDForMessageID(this, messageID, skipCache);
  }

  _recentSyncDraftIds = new Map<string, number>();

  reportRecentSyncDraftId(syncDraftId: string) {
    const count: number | null | undefined =
      this._recentSyncDraftIds.get(syncDraftId);
    const newCount = (count ?? 0) + 1;
    this._recentSyncDraftIds.set(syncDraftId, newCount);
  }
  reportDraftClosed(syncDraftId: string) {
    Kefir.later(30 * 1000, undefined)
      .takeUntilBy(this._stopper)
      .onValue(() => {
        const count: number | null | undefined =
          this._recentSyncDraftIds.get(syncDraftId);
        let newCount;
        if (count == null || count < 1) {
          newCount = 0;
          this._logger.error(
            new Error('_recentSyncDraftIds count had unexpected value'),
            {
              count,
            },
          );
        } else {
          newCount = count - 1;
        }
        if (newCount === 0) {
          this._recentSyncDraftIds.delete(syncDraftId);
        } else {
          this._recentSyncDraftIds.set(syncDraftId, newCount);
        }
      });
  }
  isRecentSyncDraftId(syncMessageId: string): boolean {
    return this._recentSyncDraftIds.has(syncMessageId);
  }

  _selectedThreadRows = t.mapcat((gmailRowListView: GmailRowListView) =>
    gmailRowListView.getSelectedThreadRowViewDrivers(),
  );
  getSelectedThreadRowViewDrivers(): ReadonlyArray<GmailThreadRowView> {
    if (!this._currentRouteViewDriver) {
      return [];
    }
    return t.toArray(
      this._currentRouteViewDriver.getRowListViews(),
      this._selectedThreadRows,
    );
  }

  _threadRowViewSelectionChanges = kefirBus();

  signalThreadRowViewSelectionChange() {
    this._threadRowViewSelectionChanges.value(undefined);
  }

  registerThreadRowViewSelectionHandler(handler: () => any): () => void {
    this._threadRowViewSelectionChanges.onValue(handler);
    return () => {
      this._threadRowViewSelectionChanges.offValue(handler);
    };
  }
}

export default GmailDriver;
