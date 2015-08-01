/* @flow */
//jshint ignore:start

import _ from 'lodash';
import RSVP from 'rsvp';
import * as Bacon from 'baconjs';
import * as Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import baconCast from 'bacon-cast';
import kefirCast from 'kefir-cast';
import waitFor from '../../lib/wait-for';
import asap from 'asap';

import addAccessors from 'add-accessors';
import showAppIdWarning from './gmail-driver/show-app-id-warning';

import GmailElementGetter from './gmail-element-getter';
import makeXhrInterceptor from './make-xhr-interceptor';
import GmailThreadView from './views/gmail-thread-view';

import GmailTopMessageBarDriver from './widgets/gmail-top-message-bar-driver';
import GmailModalViewDriver from './widgets/gmail-modal-view-driver';
import GmailMoleViewDriver from './widgets/gmail-mole-view-driver';
import GmailRouteProcessor from './views/gmail-route-view/gmail-route-processor';
import KeyboardShortcutHelpModifier from './gmail-driver/keyboard-shortcut-help-modifier';
import openDraftByMessageID from './gmail-driver/open-draft-by-message-id';
import UserInfo from './gmail-driver/user-info';
import GmailButterBarDriver from './gmail-butter-bar-driver';
import getGmailThreadIdForRfcMessageId from './gmail-driver/get-gmail-thread-id-for-rfc-message-id';
import getRfcMessageIdForGmailMessageId from './gmail-driver/get-rfc-message-id-for-gmail-message-id';
import MessageIdManager from '../../lib/message-id-manager';
import showCustomThreadList from './gmail-driver/show-custom-thread-list';
import showCustomRouteView from './gmail-driver/show-custom-route-view';
import showNativeRouteView from './gmail-driver/show-native-route-view';
import registerSearchSuggestionsProvider from './gmail-driver/register-search-suggestions-provider';
import createKeyboardShortcutHandle from './gmail-driver/create-keyboard-shortcut-handle';
import setupComposeViewDriverStream from './gmail-driver/setup-compose-view-driver-stream';
import trackEvents from './gmail-driver/track-events';
import gmailLoadEvent from './gmail-driver/gmail-load-event';
import maintainComposeWindowState from './gmail-driver/maintain-compose-window-state';
import overrideGmailBackButton from './gmail-driver/override-gmail-back-button';

import type Logger from '../../lib/logger';
import type PageCommunicator from './page-communicator';
import type ButterBar from '../../platform-implementation/butter-bar';
import type GmailKeyboardShortcutHandle from './views/gmail-keyboard-shortcut-handle';
import type {Driver, ShortcutDescriptor} from '../../driver-interfaces/driver';

export default class GmailDriver {
	_appId: string;
	_logger: Logger;
	_customRouteIDs: Set<string>;
	_customListRouteIDs: Map<string, Function>;
	_customListSearchStringsToRouteIds: Map<string, string>;
	_messageIDsToThreadIDs: Map<string, string>;
	_messageIdManager: MessageIdManager;
	_gmailRouteProcessor: GmailRouteProcessor;
	_keyboardShortcutHelpModifier: KeyboardShortcutHelpModifier;
	_butterBarDriver: GmailButterBarDriver;
	onready: Promise<void>;
	_pageCommunicator: PageCommunicator;
	_pageCommunicatorPromise: Promise<PageCommunicator>;
	_butterBar: ?ButterBar;
	_butterBarDriver: GmailButterBarDriver;
	_routeViewDriverStream: Bacon.Observable<Object>;
	_rowListViewDriverStream: Bacon.Observable<Object>;
	_threadRowViewDriverKefirStream: Kefir.Stream<Object>;
	_threadViewDriverStream: Bacon.Observable<Object>;
	_toolbarViewDriverStream: Bacon.Observable<Object>;
	_composeViewDriverStream: Bacon.Observable<Object>;
	_xhrInterceptorStream: Bacon.Observable<Object>;
	_messageViewDriverStream: Bacon.Observable<Object>;
	_stopper: Kefir.Stream&{destroy:()=>void};
	_bStopper: Bacon.Observable;
	_userInfo: UserInfo;

	constructor(appId: string, opts: Object, LOADER_VERSION: string, IMPL_VERSION: string, logger: Logger) {
		require('./custom-style');

		this._appId = appId;
		this._logger = logger;
		this._customRouteIDs = new Set();
		this._customListRouteIDs = new Map();
		this._customListSearchStringsToRouteIds = new Map();

		this._messageIDsToThreadIDs = new Map();
		this._stopper = kefirStopper();
		this._bStopper = baconCast(Bacon, this._stopper).toProperty();

		this._messageIdManager = new MessageIdManager({
			getGmailThreadIdForRfcMessageId: (rfcMessageId) =>
				getGmailThreadIdForRfcMessageId(this, rfcMessageId),
			getRfcMessageIdForGmailMessageId: (gmailMessageId) =>
				getRfcMessageIdForGmailMessageId(this, gmailMessageId)
		});

		this._gmailRouteProcessor = new GmailRouteProcessor();
		this._keyboardShortcutHelpModifier = new KeyboardShortcutHelpModifier();
		this._butterBarDriver = new GmailButterBarDriver();

		this._setupEventStreams();

		this.onready.then(() => {
			trackEvents(this);
			gmailLoadEvent(this);
			maintainComposeWindowState(this);
			overrideGmailBackButton(this, this._gmailRouteProcessor);
		});
	}

	destroy() {
		this._keyboardShortcutHelpModifier.destroy();
		this._stopper.destroy();
	}

	getAppId(): string {return this._appId;}
	getPageCommunicator(): PageCommunicator {return this._pageCommunicator;}
	getPageCommunicatorPromise(): Promise<PageCommunicator> {return this._pageCommunicatorPromise;}
	getLogger(): Logger {return this._logger;}
	getCustomListSearchStringsToRouteIds(): Map<string, string> {return this._customListSearchStringsToRouteIds;}
	getMessageIdManager(): MessageIdManager {return this._messageIdManager;}
	getButterBarDriver(): GmailButterBarDriver {return this._butterBarDriver;}
	getButterBar(): ButterBar {return this._butterBar;}
	setButterBar(bb: ButterBar) {
		this._butterBar = bb;
	}
	getCustomRouteIDs(): Set<string> {return this._customRouteIDs;}
	getCustomListRouteIDs(): Map<string, Function> {return this._customListRouteIDs;}
	getKeyboardShortcutHelpModifier(): KeyboardShortcutHelpModifier {return this._keyboardShortcutHelpModifier;}
	getRouteViewDriverStream(): Bacon.Observable<Object> {return this._routeViewDriverStream;}
	getRowListViewDriverStream(): Bacon.Observable<Object> {return this._rowListViewDriverStream;}
	getThreadRowViewDriverKefirStream(): Kefir.Stream<Object> {return this._threadRowViewDriverKefirStream;}
	getThreadViewDriverStream(): Bacon.Observable<Object> {return this._threadViewDriverStream;}
	getToolbarViewDriverStream(): Bacon.Observable<Object> {return this._toolbarViewDriverStream;}
	getComposeViewDriverStream(): Bacon.Observable<Object> {return this._composeViewDriverStream;}
	getXhrInterceptorStream(): Bacon.Observable<Object> {return this._xhrInterceptorStream;}
	getMessageViewDriverStream(): Bacon.Observable<Object> {return this._messageViewDriverStream;}
	getStopper(): Kefir.Stream {return this._stopper;}
	getBaconStopper(): Bacon.Observable {return this._bStopper;}

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

	showCustomThreadList(customRouteID: string, onActivate: Function) {
		showCustomThreadList(this, customRouteID, onActivate);
	}

	showCustomRouteView(element: HTMLElement) {
		showCustomRouteView(this, element);
	}

	showNativeRouteView() {
		showNativeRouteView(this);
	}

	createLink(routeID: string, params: ?{[ix: string]: string}) {
		return require('./gmail-driver/create-link')(this._gmailRouteProcessor, routeID, params);
	}

	goto(routeID: string, params: ?{[ix: string]: string}) {
		return require('./gmail-driver/goto-view')(this, routeID, params);
	}

	resolveUrlRedirects(url: string): Promise<string> {
		return this._pageCommunicatorPromise.then(pageCommunicator =>
			pageCommunicator.resolveUrlRedirects(url));
	}

	registerSearchSuggestionsProvider(handler: Function) {
		registerSearchSuggestionsProvider(this, handler);
	}

	registerSearchQueryRewriter(obj: Object) {
		require('./gmail-driver/register-search-query-rewriter')(this._pageCommunicator, obj);
	}

	addToolbarButtonForApp(buttonDescriptor: Object): Promise<Object> {
		return require('./gmail-driver/add-toolbar-button-for-app')(this, buttonDescriptor);
	}

	openComposeWindow() {
		require('./gmail-driver/open-compose-window')(this);
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

	addNavItem(appId: string, navItemDescriptor: Object): Object {
		return require('./gmail-driver/add-nav-item')(appId, navItemDescriptor);
	}

	getSentMailNativeNavItem(): Object {
		return require('./gmail-driver/get-native-nav-item')('sent');
	}

	setShowNativeNavMarker(value: boolean) {
		/*const*/var leftNavContainerElement = GmailElementGetter.getLeftNavContainerElement();
		if(leftNavContainerElement){
			if (value) {
				leftNavContainerElement.classList.remove('inboxsdk__hide_native_marker');
			} else {
				leftNavContainerElement.classList.add('inboxsdk__hide_native_marker');
			}
		}
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

	createKeyboardShortcutHandle(shortcutDescriptor: Object, appId: ?string, appName: ?string, appIconUrl: ?string): GmailKeyboardShortcutHandle {
		return createKeyboardShortcutHandle(this, shortcutDescriptor, appId, appName, appIconUrl);
	}

	_setupEventStreams() {
		var result = makeXhrInterceptor();

		this._xhrInterceptorStream = result.xhrInterceptStream.takeUntil(this._bStopper);

		this._pageCommunicatorPromise = result.pageCommunicatorPromise;

		this.onready = this._pageCommunicatorPromise.then(pageCommunicator => {
			this._pageCommunicator = pageCommunicator;
			this._logger.setUserEmailAddress(this.getUserEmailAddress());
			this._userInfo = new UserInfo(this);

			return this._userInfo.waitForAccountSwitcherReady();
		}).then(() => {
			this._routeViewDriverStream = baconCast(Bacon, require('./gmail-driver/setup-route-view-driver-stream')(
				this._gmailRouteProcessor, this
			)).doAction(routeViewDriver => {
				routeViewDriver.setPageCommunicator(this._pageCommunicator);
			}).takeUntil(this._bStopper);

			this._rowListViewDriverStream = this._setupRouteSubViewDriver('newGmailRowListView').takeUntil(this._bStopper);

			this._setupThreadRowViewDriverKefirStream();
			this._threadViewDriverStream = this._setupRouteSubViewDriver('newGmailThreadView')
												.doAction(gmailThreadView => {
													gmailThreadView.setPageCommunicator(this._pageCommunicator);
												}).takeUntil(this._bStopper);

			this._setupToolbarViewDriverStream();
			this._setupMessageViewDriverStream();
			this._setupComposeViewDriverStream();
		});
	}

	_setupComposeViewDriverStream() {
		this._composeViewDriverStream = setupComposeViewDriverStream(
			this, this._messageViewDriverStream, this._xhrInterceptorStream
		).takeUntil(this._bStopper);
	}

	_setupRouteSubViewDriver(viewName: string): Bacon.Observable<Object> {
		return this._routeViewDriverStream.flatMap((gmailRouteView) => {
			return gmailRouteView.getEventStream()
				.filter(event => event.eventName === viewName)
				.map(event => event.view);
		});
	}

	_setupThreadRowViewDriverKefirStream() {
		this._threadRowViewDriverKefirStream = kefirCast(Kefir, this._rowListViewDriverStream)
												.flatMap(rowListViewDriver => rowListViewDriver.getRowViewDriverKefirStream())
												.flatMap(threadRowViewDriver => {
													threadRowViewDriver.setPageCommunicator(this._pageCommunicator);
													// Each ThreadRowView may be delayed if the thread id is not known yet.
													return threadRowViewDriver.waitForReady();
												})
												.takeUntilBy(this._stopper);
	}

	_setupToolbarViewDriverStream() {
		this._toolbarViewDriverStream = Bacon.mergeAll(
											this._rowListViewDriverStream.map(function(gmailRowListView){
												return gmailRowListView.getToolbarView();
											}),
											this._threadViewDriverStream.map(function(gmailThreadView){
												return gmailThreadView.getToolbarView();
											})
										)
										.filter(Boolean)
										.flatMap(function(gmailToolbarView){
											return gmailToolbarView.waitForReady();
										})
										.takeUntil(this._bStopper);
	}

	_setupMessageViewDriverStream() {
		this._messageViewDriverStream = this._threadViewDriverStream.flatMap(function(gmailThreadView){
			return gmailThreadView.getEventStream().filter(function(event){
				return event.eventName === 'messageCreated';
			})
			.map(function(event){
				return event.view;
			});
		}).takeUntil(this._bStopper);
	}

	isRunningInPageContext(): boolean {
		return !!(global.GLOBALS && global._GM_main);
	}

	showAppIdWarning() {
		showAppIdWarning(this);
	}

	createTopMessageBarDriver(optionStream: Bacon.Observable): GmailTopMessageBarDriver {
		return new GmailTopMessageBarDriver(optionStream);
	}

	associateThreadAndMessageIDs(threadID: string, messageID: string) {
		this._messageIDsToThreadIDs.set(messageID, threadID);
	}

	getThreadIDForMessageID(messageID: string): string {
		return this._messageIDsToThreadIDs.get(messageID);
	}

}

// This function does not get executed. It's only checked by Flow to make sure
// this class successfully implements the type interface.
function __interfaceCheck() {
	var driver: Driver = new GmailDriver('', ({}: any), '', '', ({}: any));
}
