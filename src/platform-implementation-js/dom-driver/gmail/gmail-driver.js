/* @flow */

import RSVP from 'rsvp';
import type LiveSet from 'live-set';
import toValueObservable from 'live-set/toValueObservable';
import {defn} from 'ud';
import t from 'transducers.js';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import kefirBus from 'kefir-bus';
import type {Bus} from 'kefir-bus';
import asap from 'asap';
import includes from 'lodash/includes';

import get from '../../../common/get-or-fail';
import showAppIdWarning from './gmail-driver/show-app-id-warning';

import GmailElementGetter from './gmail-element-getter';
import makeXhrInterceptor from './make-xhr-interceptor';
import GmailBackdrop from './views/gmail-backdrop';
import type GmailThreadRowView from './views/gmail-thread-row-view';
import type GmailAppToolbarButtonView from './views/gmail-app-toolbar-button-view';

import {removeAllThreadRowUnclaimedModifications} from './views/gmail-thread-row-view';

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
import getGmailThreadIdForRfcMessageId from '../../driver-common/getGmailThreadIdForRfcMessageId';
import getRfcMessageIdForGmailThreadId from './gmail-driver/get-rfc-message-id-for-gmail-thread-id';
import getGmailMessageIdForSyncMessageId from '../../driver-common/getGmailMessageIdForSyncMessageId';
import BiMapCache from 'bimapcache';
import type KeyboardShortcutHandle from '../../views/keyboard-shortcut-handle';
import getDraftIDForMessageID from './gmail-driver/get-draft-id-for-message-id';
import type {GetDraftIdResult} from './gmail-driver/get-draft-id-for-message-id';
import addNavItem from './gmail-driver/add-nav-item';
import gotoView from './gmail-driver/goto-view';
import showCustomThreadList from './gmail-driver/show-custom-thread-list';
import showCustomRouteView from './gmail-driver/show-custom-route-view';
import showNativeRouteView from './gmail-driver/show-native-route-view';
import registerSearchSuggestionsProvider from './gmail-driver/register-search-suggestions-provider';
import setupComposeViewDriverStream from './gmail-driver/setup-compose-view-driver-stream';
import trackEvents from './gmail-driver/track-events';
import gmailLoadEvent from './gmail-driver/gmail-load-event';
import ThreadRowIdentifier from './gmail-driver/thread-row-identifier';
import customStyle from './custom-style';
import overrideGmailBackButton from './gmail-driver/override-gmail-back-button';
import addToolbarButtonForApp from './gmail-driver/add-toolbar-button-for-app';
import setupRouteViewDriverStream from './gmail-driver/setup-route-view-driver-stream';
import getNativeNavItem from './gmail-driver/get-native-nav-item';
import createLink from './gmail-driver/create-link';
import registerSearchQueryRewriter from './gmail-driver/register-search-query-rewriter';
import openComposeWindow from './gmail-driver/open-compose-window';
import GmailAppSidebarView from './views/gmail-app-sidebar-view';

import getSyncThreadFromSyncThreadId from './gmail-driver/getSyncThreadFromSyncThreadId';
import getSyncThreadForOldGmailThreadId from './gmail-driver/getSyncThreadForOldGmailThreadId';

import toItemWithLifetimeStream from '../../lib/toItemWithLifetimeStream';
import toLiveSet from '../../lib/toLiveSet';

import type Logger from '../../lib/logger';
import type PageCommunicator from './gmail-page-communicator';
import type {RouteParams} from '../../namespaces/router';
import type ButterBar from '../../namespaces/butter-bar';
import type {Driver} from '../../driver-interfaces/driver';
import type {ComposeViewDriver} from '../../driver-interfaces/compose-view-driver';
import type GmailComposeView from './views/gmail-compose-view';
import type GmailMessageView from './views/gmail-message-view';
import type GmailThreadView from './views/gmail-thread-view';
import type GmailToolbarView from './views/gmail-toolbar-view';
import type GmailRouteView from './views/gmail-route-view/gmail-route-view';
import type {PiOpts, EnvData} from '../../platform-implementation';
import type NativeGmailNavItemView from './views/native-gmail-nav-item-view';

import type ContentPanelViewDriver from '../../driver-common/sidebar/ContentPanelViewDriver';

class GmailDriver {
	_appId: string;
	_logger: Logger;
	_opts: PiOpts;
	_envData: EnvData;
	_customRouteIDs: Set<string> = new Set();
	_customListRouteIDs: Map<string, Function> = new Map();
	_customListSearchStringsToRouteIds: Map<string, string> = new Map();
	_messageIDsToThreadIDs: Map<string, string> = new Map();
	_threadRowIdentifier: ThreadRowIdentifier;
	_gmailRouteProcessor: GmailRouteProcessor;
	_keyboardShortcutHelpModifier: KeyboardShortcutHelpModifier;
	onready: Promise<void>;
	_pageCommunicator: PageCommunicator;
	_pageCommunicatorPromise: Promise<PageCommunicator>;
	_butterBar: ?ButterBar;
	_butterBarDriver: GmailButterBarDriver;
	_routeViewDriverStream: Kefir.Observable<GmailRouteView>;
	_rowListViewDriverStream: Kefir.Observable<Object>;
	_threadRowViewDriverKefirStream: Kefir.Observable<Object>;
	_threadViewDriverLiveSet: LiveSet<GmailThreadView>;
	_toolbarViewDriverLiveSet: LiveSet<GmailToolbarView>;
	_composeViewDriverStream: Kefir.Observable<GmailComposeView>;
	_xhrInterceptorStream: Kefir.Observable<Object>;
	_messageViewDriverStream: Kefir.Observable<GmailMessageView>;
	_stopper = kefirStopper();
	_navMarkerHiddenChanged: Bus<null> = kefirBus();
	_addonSidebarHiddenChanged: Bus<null> = kefirBus();
	_userInfo: UserInfo;
	_timestampAccountSwitcherReady: ?number;
	_timestampGlobalsFound: ?number;
	_timestampOnready: ?number;
	_lastCustomThreadListActivity: ?{customRouteID: string, timestamp: Date};
	_currentRouteViewDriver: GmailRouteView;
	_appSidebarView: ?GmailAppSidebarView = null;

	getGmailThreadIdForRfcMessageId: (rfcId: string) => Promise<string>;
	getRfcMessageIdForGmailThreadId: (threadId: string) => Promise<string>;
	getSyncThreadIdForOldGmailThreadId: (threadId: string) => Promise<string>;
	getOldGmailThreadIdFromSyncThreadId: (threadId: string) => Promise<string>;
	getGmailMessageIdForSyncMessageId: (syncMessageId: string) => Promise<string>;

	constructor(appId: string, LOADER_VERSION: string, IMPL_VERSION: string, logger: Logger, opts: PiOpts, envData: EnvData) {
		(this: Driver); // interface check
		customStyle();

		this._appId = appId;
		this._logger = logger;
		this._opts = opts;
		this._envData = envData;

		// Manages the mapping between RFC Message Ids and Gmail Message Ids. Caches to
		// localStorage. Used for custom thread lists.
		{
			const rfcIdCache = new BiMapCache({
				key: 'inboxsdk__cached_thread_ids',
				getAfromB: (gmailThreadId) =>
					getRfcMessageIdForGmailThreadId(this, gmailThreadId),
				getBfromA: (rfcMessageId) =>
					getGmailThreadIdForRfcMessageId(this, rfcMessageId)
			});
			this.getGmailThreadIdForRfcMessageId = (rfcMessageId) => rfcIdCache.getBfromA(rfcMessageId);
			this.getRfcMessageIdForGmailThreadId = (gmailThreadId) => rfcIdCache.getAfromB(gmailThreadId);
		}

		// Manages mapping between old hex thread ids and new sync based thread ids
		{
			const syncThreadIdToOldGmailThreadIdCache = new BiMapCache({
				key: 'inboxsdk__cached_sync_thread_id_old_gmail_thread_id',
				getAfromB: (oldGmailThreadId: string) => {
					return getSyncThreadForOldGmailThreadId(this, oldGmailThreadId).then(({syncThreadID}) => syncThreadID);
				},
				getBfromA: (syncThreadID: string) => {
					return getSyncThreadFromSyncThreadId(this, syncThreadID).then(syncThread => {
						if(syncThread) return syncThread.oldGmailThreadID;
						else throw new Error('syncThread not found');
					});
				}
			});
			this.getSyncThreadIdForOldGmailThreadId = oldGmailThreadId =>
				syncThreadIdToOldGmailThreadIdCache.getAfromB(oldGmailThreadId);

			this.getOldGmailThreadIdFromSyncThreadId = syncThreadId =>
				syncThreadIdToOldGmailThreadIdCache.getBfromA(syncThreadId);
		}

		// mapping between sync message ids and old message ids
		{
			const gmailMessageIdForSyncMessageIdCache = new BiMapCache({
				key: 'inboxsdk__cached_gmail_and_inbox_message_ids_2',
				getAfromB: (sync: string) => getGmailMessageIdForSyncMessageId(this, sync),
				getBfromA() {
					throw new Error('should not happen');
				}
			});
			this.getGmailMessageIdForSyncMessageId = syncMessageId =>
				gmailMessageIdForSyncMessageIdCache.getAfromB(syncMessageId);
		}

		this._gmailRouteProcessor = new GmailRouteProcessor();
		this._keyboardShortcutHelpModifier = new KeyboardShortcutHelpModifier();
		this._butterBarDriver = new GmailButterBarDriver();

		this._setupEventStreams();

		this.onready.then(() => {
			this._timestampOnready = Date.now();
			trackEvents(this);
			gmailLoadEvent(this);
			overrideGmailBackButton(this, this._gmailRouteProcessor);
			trackGmailStyles();
		}).catch(err => {
			this._logger.error(err);
		});
	}

	destroy() {
		this._keyboardShortcutHelpModifier.destroy();
		this._stopper.destroy();


		removeAllThreadRowUnclaimedModifications();
	}

	getAppId(): string {return this._appId;}
	getOpts(): PiOpts {return this._opts;}
	getPageCommunicator(): PageCommunicator {return this._pageCommunicator;}
	getPageCommunicatorPromise(): Promise<PageCommunicator> {return this._pageCommunicatorPromise;}
	getLogger(): Logger {return this._logger;}
	getCustomListSearchStringsToRouteIds(): Map<string, string> {return this._customListSearchStringsToRouteIds;}
	getThreadRowIdentifier(): ThreadRowIdentifier {return this._threadRowIdentifier;}
	getButterBarDriver(): GmailButterBarDriver {return this._butterBarDriver;}
	getButterBar(): ?ButterBar {return this._butterBar;}
	setButterBar(bb: ButterBar) {
		this._butterBar = bb;
	}
	getCustomRouteIDs(): Set<string> {return this._customRouteIDs;}
	getCustomListRouteIDs(): Map<string, Function> {return this._customListRouteIDs;}
	getKeyboardShortcutHelpModifier(): KeyboardShortcutHelpModifier {return this._keyboardShortcutHelpModifier;}
	getRouteViewDriverStream() {return this._routeViewDriverStream;}
	getRowListViewDriverStream() {return this._rowListViewDriverStream;}
	getThreadRowViewDriverStream() {return this._threadRowViewDriverKefirStream;}
	getThreadViewDriverStream() {
		return toItemWithLifetimeStream(this._threadViewDriverLiveSet).map(({el})=>el);
	}
	getAttachmentCardViewDriverStream() {
		return this._messageViewDriverStream
			.flatMap(messageViewDriver =>
				messageViewDriver.isLoaded() ?
					Kefir.constant(messageViewDriver) :
					messageViewDriver.getEventStream()
						.filter(event => event.eventName === 'messageLoad')
						.map(() => messageViewDriver)
						.take(1)
			)
			.map(messageView => messageView.getAttachmentCardViewDrivers())
			.flatten();
	}
	getComposeViewDriverStream() {return this._composeViewDriverStream;}
	getXhrInterceptorStream(): Kefir.Observable<Object> {return this._xhrInterceptorStream;}
	getMessageViewDriverStream() {return this._messageViewDriverStream;}
	getStopper(): Kefir.Observable<null> {return this._stopper;}
	getEnvData(): EnvData {return this._envData;}

	getTimings(): {[ix:string]:?number} {
		return {
			piMainStarted: this._envData.piMainStarted,
			piLoadStarted: this._envData.piLoadStarted,
			globalsFound: this._timestampGlobalsFound,
			accountSwitcherReady: this._timestampAccountSwitcherReady,
			onready: this._timestampOnready
		};
	}

	registerThreadButton(options: Object) {
		const unregister = kefirStopper();

		const removeButtonOnUnregister = button => {
			unregister.takeUntilBy(button.getStopper()).onValue(() => {
				button.destroy();
			});
		};

		const toolbarViewSub = toValueObservable(this._toolbarViewDriverLiveSet).subscribe(({value: gmailToolbarView}: {value: GmailToolbarView}) => {
			if (gmailToolbarView.isForThread()) {
				if (!options.positions || includes(options.positions, 'THREAD')) {
					removeButtonOnUnregister(gmailToolbarView.addButton({
						...options,
						section: options.threadSection || 'METADATA_STATE',
						onClick: event => {
							options.onClick({
								position: 'THREAD',
								dropdown: event.dropdown,
								selectedThreadViewDrivers: [gmailToolbarView.getThreadViewDriver()],
								selectedThreadRowViewDrivers: []
							});
						}
					}));
				}
			} else if (gmailToolbarView.isForRowList()) {
				if (!options.positions || includes(options.positions, 'LIST')) {
					removeButtonOnUnregister(gmailToolbarView.addButton({
						...options,
						section: options.listSection || 'METADATA_STATE',
						onClick: event => {
							const selectedThreadRowViewDrivers = Array.from(gmailToolbarView.getThreadRowViewDrivers())
								.filter(gmailThreadRow => gmailThreadRow.isSelected());

							options.onClick({
								position: 'LIST',
								dropdown: event.dropdown,
								selectedThreadViewDrivers: [],
								selectedThreadRowViewDrivers
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
			const perThreadRow = (gmailThreadRow: GmailThreadRowView) => {
				gmailThreadRow.addButton(Kefir.constant({
					hasDropdown: options.hasDropdown,
					iconClass: options.iconClass,
					iconUrl: options.iconUrl,
					orderHint: options.orderHint,
					onClick: event => {
						if (!options.onClick) return;
						options.onClick({
							position: 'ROW',
							dropdown: event.dropdown,
							selectedThreadViewDrivers: [],
							selectedThreadRowViewDrivers: [gmailThreadRow]
						});
					},
				}).merge(unregister));
			};

			if (this._currentRouteViewDriver) {
				this._currentRouteViewDriver.getRowListViews().forEach(gmailRowListView => {
					gmailRowListView.getThreadRowViewDrivers().forEach(perThreadRow);
				});
			}
			const threadRowViewSub = this._threadRowViewDriverKefirStream.observe({
				value: perThreadRow
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
			throw new Error("bad hash");
		}
		window.history.replaceState(null, null, hash);
		var hce = new (window:any).HashChangeEvent('hashchange', {
			oldURL: document.location.href.replace(/#.*$/, '')+'#inboxsdk-fake-no-vc',
			newURL: document.location.href.replace(/#.*$/, '')+hash
		});
		window.dispatchEvent(hce);
	}

	addCustomRouteID(routeID: string): () => void {
		this._customRouteIDs.add(routeID);
		return () => {
			this._customRouteIDs.delete(routeID);
		};
	}

	addCustomListRouteID(routeID: string, handler: Function): () => void {
		this._customListRouteIDs.set(routeID, handler);
		return () => {
			this._customListRouteIDs.delete(routeID);
		};
	}

	signalCustomThreadListActivity(customRouteID: string) {
		this._lastCustomThreadListActivity = {customRouteID, timestamp: new Date()};
	}

	// Returns the last time a request for a custom thread list search has gone
	// out or we got a response, and the customRouteID for that.
	getLastCustomThreadListActivity(): ?{customRouteID: string, timestamp: Date} {
		return this._lastCustomThreadListActivity;
	}

	showCustomThreadList(customRouteID: string, onActivate: Function, params: Array<string>) {
		showCustomThreadList(this, customRouteID, onActivate, params);
	}

	showCustomRouteView(element: HTMLElement) {
		showCustomRouteView(this, element);
	}

	showNativeRouteView() {
		showNativeRouteView(this);
	}

	createLink(routeID: string, params: ?RouteParams|string) {
		return createLink(this._gmailRouteProcessor, routeID, params);
	}

	goto(routeID: string, params: ?RouteParams|string) {
		return gotoView(this, routeID, params);
	}

	resolveUrlRedirects(url: string): Promise<string> {
		return this._pageCommunicatorPromise.then(pageCommunicator =>
			pageCommunicator.resolveUrlRedirects(url));
	}

	registerSearchSuggestionsProvider(handler: Function) {
		registerSearchSuggestionsProvider(this, handler);
	}

	registerSearchQueryRewriter(obj: Object) {
		registerSearchQueryRewriter(this._pageCommunicator, obj);
	}

	addToolbarButtonForApp(buttonDescriptor: Object): Promise<GmailAppToolbarButtonView> {
		return addToolbarButtonForApp(this, buttonDescriptor);
	}

	openComposeWindow() {
		openComposeWindow(this).catch(err => this._logger.error(err));
	}

	openDraftByMessageID(messageID: string) {
		openDraftByMessageID(this, messageID);
	}

	createModalViewDriver(options: Object): GmailModalViewDriver {
		return new GmailModalViewDriver(options);
	}

	createMoleViewDriver(options: Object): GmailMoleViewDriver {
		return new GmailMoleViewDriver(options);
	}

	createDrawerViewDriver(options) {
		return new InboxDrawerView(options);
	}

	createBackdrop(zIndex, target) {
		return new GmailBackdrop(zIndex, target);
	}

	addNavItem(appId: string, navItemDescriptorPropertyStream: Kefir.Observable<Object>): Object {
		return addNavItem(this, appId, navItemDescriptorPropertyStream);
	}

	getSentMailNativeNavItem(): Promise<NativeGmailNavItemView> {
		const p = getNativeNavItem(this, 'sent');
		p.catch(err => this._logger.error(err));
		return p;
	}

	setShowNativeNavMarker(isNative: boolean) {
		this._navMarkerHiddenChanged.emit(null);
		const leftNavContainerElement = GmailElementGetter.getLeftNavContainerElement();
		if(leftNavContainerElement){
			if (isNative) {
				leftNavContainerElement.classList.remove('inboxsdk__hide_native_marker');
			} else {
				leftNavContainerElement.classList.add('inboxsdk__hide_native_marker');
				this._stopper.takeUntilBy(this._navMarkerHiddenChanged).onValue(() => {
					leftNavContainerElement.classList.remove('inboxsdk__hide_native_marker');
				});
			}
		}
	}

	setShowNativeAddonSidebar(isNative: boolean) {
		this._addonSidebarHiddenChanged.emit(null);
		const addonContainerElement = GmailElementGetter.getAddonSidebarContainerElement();
		const mainContentBodyContainerElement = GmailElementGetter.getMainContentBodyContainerElement();

		if(addonContainerElement && mainContentBodyContainerElement){
			const parent = mainContentBodyContainerElement.parentElement;
			if(!parent) return;

			if (isNative) {
				parent.classList.remove('inboxsdk__hide_addon_container');
			} else {
				parent.classList.add('inboxsdk__hide_addon_container');
				this._stopper.takeUntilBy(this._addonSidebarHiddenChanged).onValue(() => {
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
			name: this._userInfo.getUserName()
		};
	}

	getAccountSwitcherContactList(): Contact[] {
		return this._userInfo.getAccountSwitcherContactList();
	}

	activateShortcut(keyboardShortcutHandle: KeyboardShortcutHandle, appName: ?string, appIconUrl: ?string) {
		this.getKeyboardShortcutHelpModifier().set(keyboardShortcutHandle, this._appId, appName, appIconUrl);
		keyboardShortcutHandle.once('destroy', () => {
			this.getKeyboardShortcutHelpModifier().delete(keyboardShortcutHandle);
		});
	}

	_setupEventStreams() {
		var result = makeXhrInterceptor();

		this._xhrInterceptorStream = result.xhrInterceptStream.takeUntilBy(this._stopper);

		this._pageCommunicatorPromise = result.pageCommunicatorPromise;

		this.onready = this._pageCommunicatorPromise.then(pageCommunicator => {
			this._timestampGlobalsFound = Date.now();
			this._pageCommunicator = pageCommunicator;
			this._logger.setUserEmailAddress(this.getUserEmailAddress());
			this._logger.setIsUsingSyncAPI(pageCommunicator.isUsingSyncAPI());
			this._logger.setIsUsingMaterialGmailUI(GmailElementGetter.isUsingMaterialUI());
			this._userInfo = new UserInfo(this);

			return this._userInfo.waitForAccountSwitcherReady();
		}).then(() => {
			this._timestampAccountSwitcherReady = Date.now();

			if (!GmailElementGetter.isUsingMaterialUI()) {
				((document.body:any):HTMLElement).classList.add('inboxsdk__gmailv1css');
			}

			this._routeViewDriverStream = setupRouteViewDriverStream(
				this._gmailRouteProcessor, this
			).takeUntilBy(this._stopper).toProperty();

			this._routeViewDriverStream.onValue(gmailRouteView => {
				this._currentRouteViewDriver = gmailRouteView;
			});

			this._rowListViewDriverStream = this._setupRouteSubViewDriver('newGmailRowListView').takeUntilBy(this._stopper);

			this._setupThreadRowViewDriverKefirStream();
			this._threadViewDriverLiveSet = toLiveSet(
				this._setupRouteSubViewDriver('newGmailThreadView')
					.takeUntilBy(this._stopper)
					.flatMap(gmailThreadView => (
						gmailThreadView.getReadyStream()
							.map(() => gmailThreadView)
					))
					.map(gmailThreadView => ({
						el: gmailThreadView, removalStream: gmailThreadView.getStopper()
					})
				)
			);

			this._setupToolbarViewDriverStream();
			this._setupMessageViewDriverStream();
			this._setupComposeViewDriverStream();

			this._threadRowIdentifier = new ThreadRowIdentifier(this);
		});
	}

	_setupComposeViewDriverStream() {
		this._composeViewDriverStream =
			setupComposeViewDriverStream(
				this,
				this._messageViewDriverStream,
				this._xhrInterceptorStream
			)
			.takeUntilBy(this._stopper);
	}

	_setupRouteSubViewDriver(viewName: string): Kefir.Observable<Object> {
		return this._routeViewDriverStream.flatMap((gmailRouteView) => {
			return gmailRouteView.getEventStream()
				.filter(event => event.eventName === viewName)
				.map(event => event.view);
		});
	}

	_setupThreadRowViewDriverKefirStream() {
		this._threadRowViewDriverKefirStream = this._rowListViewDriverStream
												.flatMap(rowListViewDriver => rowListViewDriver.getRowViewDriverStream())
												.takeUntilBy(this._stopper);
	}

	_setupToolbarViewDriverStream() {
		this._toolbarViewDriverLiveSet = toLiveSet(Kefir.merge([
				this._rowListViewDriverStream.map(gmailRowListView =>
					gmailRowListView.getToolbarView()
				),
				this.getThreadViewDriverStream().map(gmailThreadView =>
					gmailThreadView.getToolbarView()
				)
			])
			.filter(Boolean)
			.flatMap(gmailToolbarView => gmailToolbarView.waitForReady())
			.map(gmailToolbarView => ({
				el: gmailToolbarView, removalStream: gmailToolbarView.getStopper()
			}))
			.takeUntilBy(this._stopper));
		this._toolbarViewDriverLiveSet.subscribe({});
	}

	_setupMessageViewDriverStream() {
		this._messageViewDriverStream = this.getThreadViewDriverStream().flatMap(gmailThreadView =>
			gmailThreadView.getMessageViewDriverStream()
		).takeUntilBy(this._stopper);
	}

	addGlobalSidebarContentPanel(descriptor: Kefir.Observable<Object>): Promise<?ContentPanelViewDriver> {
		if(this.isUsingMaterialUI()){
			const appSidebar = this.getGlobalSidebar();
			return Promise.resolve(appSidebar.addGlobalSidebarContentPanel(descriptor));
		}
		else {
			return Promise.resolve(null);
		}
	}

	getGlobalSidebar(): GmailAppSidebarView {
		let appSidebarView = this._appSidebarView;
		if(!appSidebarView){
			const companionSidebarContentContainerEl = GmailElementGetter.getCompanionSidebarContentContainerElement();
			if(!companionSidebarContentContainerEl) throw new Error('did not find companionSidebarContentContainerEl');
			appSidebarView = this._appSidebarView = new GmailAppSidebarView(this, companionSidebarContentContainerEl);
		}

		return appSidebarView;
	}

	isRunningInPageContext(): boolean {
		return !!(global.GLOBALS && global._GM_main);
	}

	isUsingMaterialUI(): boolean {
		return GmailElementGetter.isUsingMaterialUI();
	}

	isUsingSyncAPI(): boolean {
		return this._pageCommunicator.isUsingSyncAPI();
  }

	showAppIdWarning() {
		showAppIdWarning(this);
	}

	createTopMessageBarDriver(optionStream: Kefir.Observable<?Object>): GmailTopMessageBarDriver {
		return new GmailTopMessageBarDriver(optionStream);
	}

	associateThreadAndMessageIDs(threadID: string, messageID: string) {
		this._messageIDsToThreadIDs.set(messageID, threadID);
	}

	getThreadIDForMessageID(messageID: string): string {
		return get(this._messageIDsToThreadIDs, messageID);
	}

	getDraftIDForMessageID(messageID: string, skipCache=false): Promise<GetDraftIdResult> {
		return getDraftIDForMessageID(this, messageID, skipCache);
	}

}

export default defn(module, GmailDriver);
