var _ = require('lodash');
var RSVP = require('rsvp');
var Bacon = require('baconjs');

require('./custom-style');

var Driver = require('../../driver-interfaces/driver');
var GmailElementGetter = require('./gmail-element-getter');
var makeXhrInterceptor = require('./make-xhr-interceptor');
var GmailThreadView = require('./views/gmail-thread-view');

var GmailModalView = require('./widgets/gmail-modal-view');
var GmailRouteProcessor = require('./views/gmail-route-view/gmail-route-processor');


var GmailDriver = function(){
	Driver.call(this);

	this._gmailRouteProcessor = new GmailRouteProcessor();
	this._setupEventStreams();
};

GmailDriver.prototype = Object.create(Driver.prototype);

_.extend(GmailDriver.prototype, {

	__memberVariables: [
		{name: '_pageCommunicator', destroy: false, get: true},
		{name: '_routeViewDriverStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_rowListViewDriverStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_threadRowViewDriverStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_threadViewDriverStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_toolbarViewDriverStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_composeViewDriverStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_xhrInterceptorStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_messageViewDriverStream', destroy: true, get: true, destroyFunction: 'end'}
	],

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

	createSearchFilter: function(obj) {
		var self = this;
		this._pageCommunicator.createCustomSearchTerm(obj.term);

		this._pageCommunicator.ajaxInterceptStream.filter(function(event) {
			return event.type === 'searchQueryForReplacement' && event.term === obj.term;
		}).onValue(function(event) {
			RSVP.Promise.resolve(obj.termReplacer({})).then(function(result) {
				if (!Array.isArray(result)) {
					throw new Error("termReplacer response must be array");
				}
				var newTerm = "(" + result.map(function(item) {
					if (!item.rfc822msgid) {
						throw new Error("rfc822msgid property required");
					}
					return 'rfc822msgid:' + item.rfc822msgid;
				}).join(' OR ') + ")";
				var newQuery = event.query.replace(obj.term, newTerm.replace(/\$/g, '$$$$'));
				self._pageCommunicator.setSearchTermReplacement(event.query, newQuery);
			});
		});
	},

	openComposeWindow: function(){
		require('./gmail-driver/open-compose-window')(this);
	},

	createModalView: function(options){
		return new GmailModalView(options);
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

		this._rowListViewDriverStream = this._setupRouteSubViewDriver('newGmailRowlistView');

		// Each ThreadRowView may be delayed if the thread id is not known yet.
		this._threadRowViewDriverStream = this._setupRouteSubViewDriver('newGmailThreadRowView')
			.flatMap(function(viewDriver) {
				viewDriver.setPageCommunicator(self._pageCommunicator);
				return viewDriver.waitForReady();
			});

		this._threadViewDriverStream = this._setupRouteSubViewDriver('newGmailThreadView');

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
		this._toolbarViewDriverStream = new Bacon.Bus();

		this._toolbarViewDriverStream.plug(
			this._rowListViewDriverStream.map(function(gmailRowListView){
				return gmailRowListView.getToolbarView();
			})
		);

		this._toolbarViewDriverStream.plug(
			this._threadViewDriverStream.map(function(gmailThreadView){
				return gmailThreadView.getToolbarView();
			})
		);
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
