const _ = require('lodash');
const RSVP = require('rsvp');
const Bacon = require('baconjs');
const Kefir = require('kefir');
const kefirCast = require('kefir-cast');
const Logger = require('../../lib/logger');

require('./custom-style');

var Driver = require('../../driver-interfaces/driver');
var GmailElementGetter = require('./gmail-element-getter');
var makeXhrInterceptor = require('./make-xhr-interceptor');
var GmailThreadView = require('./views/gmail-thread-view');

var GmailModalViewDriver = require('./widgets/gmail-modal-view-driver');
var GmailRouteProcessor = require('./views/gmail-route-view/gmail-route-processor');
var KeyboardShortcutHelpModifier = require('./gmail-driver/keyboard-shortcut-help-modifier');
const GmailButterBarDriver = require('./gmail-butter-bar-driver');

import MessageIdManager from '../../lib/message-id-manager';

var GmailDriver = function(appId, opts, LOADER_VERSION, IMPL_VERSION) {
	Driver.call(this);

	this._logger = new Logger(appId, opts, LOADER_VERSION, IMPL_VERSION);

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
	this._logger.setUserEmailAddress(this.getUserEmailAddress());

	require('./gmail-driver/track-events')(this);
	require('./gmail-driver/gmail-load-event')(this);
	require('./gmail-driver/maintain-compose-window-state')(this);
};

GmailDriver.prototype = Object.create(Driver.prototype);

_.extend(GmailDriver.prototype, {

	__memberVariables: [
		{name: '_pageCommunicator', destroy: false, get: true},
		{name: '_logger', destroy: false, get: true},
		{name: '_messageIdManager', destroy: false, get: true},
		{name: '_butterBarDriver', destroy: false, get: true},
		{name: '_keyboardShortcutHelpModifier', destroy: true, get: true},
		{name: '_routeViewDriverStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_rowListViewDriverStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_threadRowViewDriverKefirStream', destroy: false, get: true},
		{name: '_threadViewDriverStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_toolbarViewDriverStream', destroy: true, get: true},
		{name: '_composeViewDriverStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_xhrInterceptorStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_messageViewDriverStream', destroy: true, get: true, destroyFunction: 'end'}
	],

	hashChangeNoViewChange(hash) {
		if (hash[0] !== '#') {
			throw new Error("bad hash");
		}
		window.history.replaceState(null, null, hash);
		const hce = new HashChangeEvent('hashchange', {
			oldURL: document.location.href.replace(/#.*$/, '')+'#inboxsdk-fake-no-vc',
			newURL: document.location.href.replace(/#.*$/, '')+hash
		});
		window.dispatchEvent(hce);
	},

	showCustomThreadList(onActivate) {
		require('./gmail-driver/show-custom-thread-list')(this, onActivate);
	},

	showCustomRouteView: function(element){
		require('./gmail-driver/show-custom-route-view')(this, element);
	},

	showNativeRouteView: function(){
		require('./gmail-driver/show-native-route-view')(this);
	},

	createLink: function(routeID, params){
		return require('./gmail-driver/create-link')(this._gmailRouteProcessor, routeID, params);
	},

	goto: function(routeID, params){
		return require('./gmail-driver/goto-view')(this, routeID, params);
	},

	registerSearchSuggestionsProvider: function(handler) {
		require('./gmail-driver/register-search-suggestions-provider')(this, handler);
	},

	registerSearchQueryRewriter: function(obj) {
		require('./gmail-driver/register-search-query-rewriter')(this._pageCommunicator, obj);
	},

	addToolbarButtonForApp: function(buttonDescriptor){
		return require('./gmail-driver/add-toolbar-button-for-app')(this, buttonDescriptor);
	},

	openComposeWindow: function(){
		require('./gmail-driver/open-compose-window')(this);
	},

	createModalViewDriver: function(options){
		return new GmailModalViewDriver(options);
	},

	addNavItem: function(appId, navItemDescriptor){
		return require('./gmail-driver/add-nav-item')(appId, navItemDescriptor);
	},

	getCurrentActiveNavItem: function(){
		return require('./gmail-driver/get-current-active-nav-item')();
	},

	getSentMailNativeNavItem: function(){
		return require('./gmail-driver/get-native-nav-item')('sent');
	},

	setNativeRouteIDs: function(nativeRouteIDs){
		this._gmailRouteProcessor.setNativeRouteIDs(nativeRouteIDs);
	},

	setNativeListRouteIDs: function(nativeListRouteIDs){
		this._gmailRouteProcessor.setNativeListRouteIDs(nativeListRouteIDs);
	},

	setRouteTypes: function(routeTypes){
		this._gmailRouteProcessor.setRouteTypes(routeTypes);
	},

	getUserEmailAddress: function() {
		return this._pageCommunicator.getUserEmailAddress();
	},

	createKeyboardShortcutHandle: function(shortcutDescriptor, appId, appIconUrl){
		return require('./gmail-driver/create-keyboard-shortcut-handle')(this, shortcutDescriptor, appId, appIconUrl);
	},

	_setupEventStreams: function(){
		var self = this;
		var result = makeXhrInterceptor();
		var xhrInterceptStream = result.xhrInterceptStream;
		this._pageCommunicator = result.pageCommunicator;

		this._xhrInterceptorStream = new Bacon.Bus();
		this._xhrInterceptorStream.plug(xhrInterceptStream);

		this._routeViewDriverStream = new Bacon.Bus();
		this._routeViewDriverStream.plug(
			require('./gmail-driver/setup-route-view-driver-stream')(this._gmailRouteProcessor).doAction(function(routeViewDriver){
				routeViewDriver.setPageCommunicator(self._pageCommunicator);
			})
		);

		this._rowListViewDriverStream = this._setupRouteSubViewDriver('newGmailRowListView');

		this._threadRowViewDriverKefirStream = kefirCast(Kefir, this._rowListViewDriverStream)
			.flatMap(rowListViewDriver => rowListViewDriver.getRowViewDriverKefirStream())
			.flatMap(threadRowViewDriver => {
				threadRowViewDriver.setPageCommunicator(this._pageCommunicator);
				// Each ThreadRowView may be delayed if the thread id is not known yet.
				return threadRowViewDriver.waitForReady();
			});

		this._threadViewDriverStream = this._setupRouteSubViewDriver('newGmailThreadView')
											.doAction(function(gmailThreadView){
												gmailThreadView.setPageCommunicator(self._pageCommunicator);
											});

		this._setupToolbarViewDriverStream();
		this._setupMessageViewDriverStream();
		this._setupComposeViewDriverStream();
	},

	_setupComposeViewDriverStream: function() {
		this._composeViewDriverStream = new Bacon.Bus();
		this._composeViewDriverStream.plug(
			require('./gmail-driver/setup-compose-view-driver-stream')(
				this, this._messageViewDriverStream, this._xhrInterceptorStream
			)
		);
	},

	_setupRouteSubViewDriver: function(viewName){
		var bus = new Bacon.Bus();

		bus.plug(
			this._routeViewDriverStream.flatMap(function(gmailRouteView){
				return gmailRouteView.getEventStream().filter(function(event){
					return event.eventName === viewName;
				})
				.map(function(event){
					return event.view;
				});
			})
		);

		return bus;
	},

	_setupToolbarViewDriverStream: function(){
		this._toolbarViewDriverStream = Bacon.mergeAll(
											this._rowListViewDriverStream.map(function(gmailRowListView){
												return gmailRowListView.getToolbarView();
											}),
											this._threadViewDriverStream.map(function(gmailThreadView){
												return gmailThreadView.getToolbarView();
											})
										)
										.flatMap(function(gmailToolbarView){
											return gmailToolbarView.waitForReady();
										});
	},

	_setupMessageViewDriverStream: function(){
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

});

module.exports = GmailDriver;
