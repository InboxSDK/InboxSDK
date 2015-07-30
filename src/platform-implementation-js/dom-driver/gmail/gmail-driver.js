import _ from 'lodash';
import RSVP from 'rsvp';
import Bacon from 'baconjs';
import Kefir from 'kefir';
import baconCast from 'bacon-cast';
import kefirCast from 'kefir-cast';
import waitFor from '../../lib/wait-for';
import asap from 'asap';

import addAccessors from 'add-accessors';
import assertInterface from '../../lib/assert-interface';
import showAppIdWarning from './gmail-driver/show-app-id-warning';

import Driver from '../../driver-interfaces/driver';
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

import MessageIdManager from '../../lib/message-id-manager';

export default class GmailDriver {
	constructor(appId, opts, LOADER_VERSION, IMPL_VERSION, logger) {
		require('./custom-style');

		this._appId = appId;
		this._logger = logger;
		this._customRouteIDs = new Set();
		this._customListRouteIDs = new Map();
		this._customListSearchStringsToRouteIds = new Map();

		this._messageIDsToThreadIDs = new Map();

		this._messageIdManager = new MessageIdManager({
			getGmailThreadIdForRfcMessageId: (rfcMessageId) =>
				require('./gmail-driver/get-gmail-thread-id-for-rfc-message-id')(this, rfcMessageId),
			getRfcMessageIdForGmailMessageId: (gmailMessageId) =>
				require('./gmail-driver/get-rfc-message-id-for-gmail-message-id')(this, gmailMessageId)
		});

		this._gmailRouteProcessor = new GmailRouteProcessor();
		this._keyboardShortcutHelpModifier = new KeyboardShortcutHelpModifier();
		this._butterBarDriver = new GmailButterBarDriver();

		this._setupEventStreams();

		this.onready.then(() => {
			require('./gmail-driver/track-events')(this);
			require('./gmail-driver/gmail-load-event')(this);
			require('./gmail-driver/maintain-compose-window-state')(this);
			require('./gmail-driver/override-gmail-back-button')(this, this._gmailRouteProcessor);
		});
	}

/*
addAccessors(GmailDriver.prototype, [
	{name: '_appId', destroy: false, get: true},
	// This isn't available until the following promise has resolved
	{name: '_pageCommunicator', destroy: false, get: true},
	{name: '_pageCommunicatorPromise', destroy: false, get: true},
	{name: '_logger', destroy: false, get: true},
	{name: '_messageIDsToThreadIDs', destroy: false},
	{name: '_customListSearchStringsToRouteIds', destroy: false, get: true},
	{name: '_messageIdManager', destroy: false, get: true},
	{name: '_butterBarDriver', destroy: false, get: true},
	{name: '_butterBar', destroy: false, get: true, set: true},
	{name: '_customRouteIDs', destroy: false, get: true},
	{name: '_customListRouteIDs', destroy: false, get: true},
	{name: '_keyboardShortcutHelpModifier', destroy: true, get: true},
	{name: '_routeViewDriverStream', destroy: true, get: true, destroyMethod: 'end'},
	{name: '_rowListViewDriverStream', destroy: true, get: true, destroyMethod: 'end'},
	{name: '_threadRowViewDriverKefirStream', destroy: false, get: true},
	{name: '_threadViewDriverStream', destroy: true, get: true, destroyMethod: 'end'},
	{name: '_toolbarViewDriverStream', destroy: true, get: true},
	{name: '_composeViewDriverStream', destroy: true, get: true, destroyMethod: 'end'},
	{name: '_xhrInterceptorStream', destroy: true, get: true, destroyMethod: 'end'},
	{name: '_messageViewDriverStream', destroy: true, get: true, destroyMethod: 'end'}
]);

*/
	destroy() {
		this._routeViewDriverStream.end();
		this._rowListViewDriverStream.end();
		this._threadViewDriverStream.end();
		this._composeViewDriverStream.end();
		this._xhrInterceptorStream.end();
		this._messageViewDriverStream.end();
		this._keyboardShortcutHelpModifier.destroy();
	}

	getAppId() {return this._appId;}
	getPageCommunicator() {return this._pageCommunicator;}
	getPageCommunicatorPromise() {return this._pageCommunicatorPromise;}
	getLogger() {return this._logger;}
	getCustomListSearchStringsToRouteIds() {return this._customListSearchStringsToRouteIds;}
	getMessageIdManager() {return this._messageIdManager;}
	getButterBarDriver() {return this._butterBarDriver;}
	getButterBar() {return this._butterBar;}
	setButterBar(bb) {
		this._butterBar = bb;
	}
	getCustomRouteIDs() {return this._customRouteIDs;}
	getCustomListRouteIDs() {return this._customListRouteIDs;}
	getKeyboardShortcutHelpModifier() {return this._keyboardShortcutHelpModifier;}
	getRouteViewDriverStream() {return this._routeViewDriverStream;}
	getRowListViewDriverStream() {return this._rowListViewDriverStream;}
	getThreadRowViewDriverKefirStream() {return this._threadRowViewDriverKefirStream;}
	getThreadViewDriverStream() {return this._threadViewDriverStream;}
	getToolbarViewDriverStream() {return this._toolbarViewDriverStream;}
	getComposeViewDriverStream() {return this._composeViewDriverStream;}
	getXhrInterceptorStream() {return this._xhrInterceptorStream;}
	getMessageViewDriverStream() {return this._messageViewDriverStream;}

	hashChangeNoViewChange(hash) {
		if (hash[0] !== '#') {
			throw new Error("bad hash");
		}
		window.history.replaceState(null, null, hash);
		/*const*/var hce = new HashChangeEvent('hashchange', {
			oldURL: document.location.href.replace(/#.*$/, '')+'#inboxsdk-fake-no-vc',
			newURL: document.location.href.replace(/#.*$/, '')+hash
		});
		window.dispatchEvent(hce);
	}

	addCustomRouteID(routeID) {
		this._customRouteIDs.add(routeID);
		return () => {
			this._customRouteIDs.delete(routeID);
		};
	}

	addCustomListRouteID(routeID, handler) {
		this._customListRouteIDs.set(routeID, handler);
		return () => {
			this._customListRouteIDs.delete(routeID);
		};
	}

	showCustomThreadList(customRouteID, onActivate) {
		require('./gmail-driver/show-custom-thread-list')(this, customRouteID, onActivate);
	}

	showCustomRouteView(element) {
		require('./gmail-driver/show-custom-route-view')(this, element);
	}

	showNativeRouteView() {
		require('./gmail-driver/show-native-route-view')(this);
	}

	createLink(routeID, params){
		return require('./gmail-driver/create-link')(this._gmailRouteProcessor, routeID, params);
	}

	goto(routeID, params){
		return require('./gmail-driver/goto-view')(this, routeID, params);
	}

	resolveUrlRedirects(url) {
		return this._pageCommunicatorPromise.then(pageCommunicator =>
			pageCommunicator.resolveUrlRedirects(url));
	}

	registerSearchSuggestionsProvider(handler) {
		require('./gmail-driver/register-search-suggestions-provider')(this, handler);
	}

	registerSearchQueryRewriter(obj) {
		require('./gmail-driver/register-search-query-rewriter')(this._pageCommunicator, obj);
	}

	addToolbarButtonForApp(buttonDescriptor) {
		return require('./gmail-driver/add-toolbar-button-for-app')(this, buttonDescriptor);
	}

	openComposeWindow() {
		require('./gmail-driver/open-compose-window')(this);
	}

	openDraftByMessageID(messageID) {
		return openDraftByMessageID(this, messageID);
	}

	createModalViewDriver(options) {
		return new GmailModalViewDriver(options);
	}

	createMoleViewDriver(options) {
		return new GmailMoleViewDriver(options);
	}

	addNavItem(appId, navItemDescriptor) {
		return require('./gmail-driver/add-nav-item')(appId, navItemDescriptor);
	}

	getSentMailNativeNavItem() {
		return require('./gmail-driver/get-native-nav-item')('sent');
	}

	setShowNativeNavMarker(value) {
		/*const*/var leftNavContainerElement = GmailElementGetter.getLeftNavContainerElement();
		if(leftNavContainerElement){
			if (value) {
				leftNavContainerElement.classList.remove('inboxsdk__hide_native_marker');
			} else {
				leftNavContainerElement.classList.add('inboxsdk__hide_native_marker');
			}
		}
	}

	getUserEmailAddress() {
		return this._pageCommunicator.getUserEmailAddress();
	}

	getUserContact() {
		return {
			emailAddress: this.getUserEmailAddress(),
			name: this._userInfo.getUserName()
		};
	}

	getAccountSwitcherContactList() {
		return this._userInfo.getAccountSwitcherContactList();
	}

	createKeyboardShortcutHandle(shortcutDescriptor, appId, appName, appIconUrl) {
		return require('./gmail-driver/create-keyboard-shortcut-handle')(this, shortcutDescriptor, appId, appName, appIconUrl);
	}

	_setupEventStreams() {
		/*const*/var result = makeXhrInterceptor();
		/*const*/var xhrInterceptStream = result.xhrInterceptStream;

		this._xhrInterceptorStream = new Bacon.Bus();
		this._xhrInterceptorStream.plug(xhrInterceptStream);

		this._pageCommunicatorPromise = result.pageCommunicatorPromise;

		this.onready = this._pageCommunicatorPromise.then(pageCommunicator => {
			this._pageCommunicator = pageCommunicator;
			this._logger.setUserEmailAddress(this.getUserEmailAddress());
			this._userInfo = new UserInfo(this);

			return this._userInfo.waitForAccountSwitcherReady();
		}).then(() => {
			this._routeViewDriverStream = new Bacon.Bus();
			this._routeViewDriverStream.plug(
				baconCast(Bacon, require('./gmail-driver/setup-route-view-driver-stream')(
					this._gmailRouteProcessor, this
				)).doAction(routeViewDriver => {
					routeViewDriver.setPageCommunicator(this._pageCommunicator);
				})
			);

			this._rowListViewDriverStream = this._setupRouteSubViewDriver('newGmailRowListView');

			this._setupThreadRowViewDriverKefirStream();
			this._threadViewDriverStream = this._setupRouteSubViewDriver('newGmailThreadView')
												.doAction(gmailThreadView => {
													gmailThreadView.setPageCommunicator(this._pageCommunicator);
												});

			this._setupToolbarViewDriverStream();
			this._setupMessageViewDriverStream();
			this._setupComposeViewDriverStream();
		});
	}

	_setupComposeViewDriverStream() {
		this._composeViewDriverStream = new Bacon.Bus();
		this._composeViewDriverStream.plug(
			require('./gmail-driver/setup-compose-view-driver-stream')(
				this, this._messageViewDriverStream, this._xhrInterceptorStream
			)
		);
	}

	_setupRouteSubViewDriver(viewName) {
		/*const*/var bus = new Bacon.Bus();
		bus.plug(
			this._routeViewDriverStream.flatMap((gmailRouteView) => {
				return gmailRouteView.getEventStream()
					.filter(event => event.eventName === viewName)
					.map(event => event.view);
			})
		);

		return bus;
	}

	_setupThreadRowViewDriverKefirStream() {
		this._threadRowViewDriverKefirStream = kefirCast(Kefir, this._rowListViewDriverStream)
												.flatMap(rowListViewDriver => rowListViewDriver.getRowViewDriverKefirStream())
												.flatMap(threadRowViewDriver => {
													threadRowViewDriver.setPageCommunicator(this._pageCommunicator);
													// Each ThreadRowView may be delayed if the thread id is not known yet.
													return threadRowViewDriver.waitForReady();
												});
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
										});
	}

	_setupMessageViewDriverStream() {
		this._messageViewDriverStream = new Bacon.Bus();

		this._messageViewDriverStream.plug(
			this._threadViewDriverStream.flatMap(function(gmailThreadView){
				return gmailThreadView.getEventStream().filter(function(event){
					return event.eventName === 'messageCreated';
				})
				.map(function(event){
					return event.view;
				});
			})
		);
	}

	isRunningInPageContext() {
		return !!(global.GLOBALS && global._GM_main);
	}

	showAppIdWarning() {
		showAppIdWarning(this);
	}

	createTopMessageBarDriver(optionStream) {
		return new GmailTopMessageBarDriver(optionStream);
	}

	associateThreadAndMessageIDs(threadID, messageID) {
		this._messageIDsToThreadIDs.set(messageID, threadID);
	}

	getThreadIDForMessageID(messageID) {
		return this._messageIDsToThreadIDs.get(messageID);
	}

}

assertInterface(GmailDriver.prototype, Driver);

/* TODO Uncomment to check against interface once GmailDriver is Flow typed.
import type {Driver} from '../../driver-interfaces/driver';

// This function does not get executed. It's only checked by Flow to make sure
// this class successfully implements the type interface.
function __interfaceCheck() {
	var driver: Driver = new GmailDriver('', ({}: any), '', '', ({}: any));
}
*/
