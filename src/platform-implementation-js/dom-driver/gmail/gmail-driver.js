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
import BiMapCache from 'bimapcache';
import type KeyboardShortcutHandle from '../../views/keyboard-shortcut-handle';
import getDraftIDForMessageID from './gmail-driver/get-draft-id-for-message-id';
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

	getGmailThreadIdForRfcMessageId: (rfcId: string) => Promise<string>;
	getRfcMessageIdForGmailThreadId: (threadId: string) => Promise<string>;

	constructor(appId: string, LOADER_VERSION: string, IMPL_VERSION: string, logger: Logger, opts: PiOpts, envData: EnvData) {
		(this: Driver); // interface check
		customStyle();

		this._appId = appId;
		this._logger = logger;
		this._opts = opts;
		this._envData = envData;

		// Manages the mapping between RFC Message Ids and Gmail Message Ids. Caches to
		// localStorage. Used for custom thread lists.
		const rfcIdCache = new BiMapCache({
			key: 'inboxsdk__cached_thread_ids',
			getAfromB: (gmailThreadId) =>
				getRfcMessageIdForGmailThreadId(this, gmailThreadId),
			getBfromA: (rfcMessageId) =>
				getGmailThreadIdForRfcMessageId(this, rfcMessageId)
		});
		this.getGmailThreadIdForRfcMessageId = (rfcMessageId) => rfcIdCache.getBfromA(rfcMessageId);
		this.getRfcMessageIdForGmailThreadId = (gmailThreadId) => rfcIdCache.getAfromB(gmailThreadId);

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
	getToolbarViewDriverStream() {
		return toItemWithLifetimeStream(this._toolbarViewDriverLiveSet).map(({el})=>el);
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
		const toolbarViewSub = toValueObservable(this._toolbarViewDriverLiveSet).subscribe(({value: gmailToolbarView}: {value: GmailToolbarView}) => {
			if (gmailToolbarView.isForThread()) {
				gmailToolbarView.addButton({
					...options,
					section: options.threadSection || 'METADATA_STATE',
					onClick: event => {
						options.onClick({
							dropdown: event.dropdown,
							selectedThreadViewDrivers: [gmailToolbarView.getThreadViewDriver()],
							selectedThreadRowViewDrivers: []
						});
					}
				});
			} else if (gmailToolbarView.isForRowList()) {
				const selectedThreadRowViewDrivers = Array.from(gmailToolbarView.getThreadRowViewDrivers())
					.filter(gmailThreadRow => gmailThreadRow.isSelected());

				gmailToolbarView.addButton({
					...options,
					section: options.listSection || 'METADATA_STATE',
					onClick: event => {
						options.onClick({
							dropdown: event.dropdown,
							selectedThreadViewDrivers: [],
							selectedThreadRowViewDrivers
						});
					}
				});
			}
		});

		return () => {
			toolbarViewSub.unsubscribe();
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
		return openDraftByMessageID(this, messageID);
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

	addNavItem(appId: string, navItemDescriptor: Object): Object {
		return addNavItem(appId, navItemDescriptor);
	}

	getSentMailNativeNavItem(): Promise<NativeGmailNavItemView> {
		const p = getNativeNavItem('sent');
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
			this._userInfo = new UserInfo(this);

			return this._userInfo.waitForAccountSwitcherReady();
		}).then(() => {
			this._timestampAccountSwitcherReady = Date.now();
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
					.map(gmailThreadView => ({
						el: gmailThreadView, removalStream: gmailThreadView.getStopper()
					}))
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
	}

	_setupMessageViewDriverStream() {
		this._messageViewDriverStream = this.getThreadViewDriverStream().flatMap(gmailThreadView =>
			gmailThreadView.getEventStream()
				.filter(event => event.eventName === 'messageCreated')
				.map(event => event.view)
		).takeUntilBy(this._stopper);
	}

	isRunningInPageContext(): boolean {
		return !!(global.GLOBALS && global._GM_main);
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

	getDraftIDForMessageID(messageID: string): Promise<?string> {
		return getDraftIDForMessageID(this, messageID);
	}

}

export default defn(module, GmailDriver);
