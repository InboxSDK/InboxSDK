var _ = require('lodash');
var Bacon = require('baconjs');

require('./custom-style');

var Driver = require('../../driver-interfaces/driver');
var GmailElementGetter = require('./gmail-element-getter');
var makeXhrInterceptor = require('./make-xhr-interceptor');
var GmailThreadView = require('./views/gmail-thread-view');

var GmailModalView = require('./widgets/gmail-modal-view');


var GmailDriver = function(){
	Driver.call(this);

	this._setupEventStreams();
};

GmailDriver.prototype = Object.create(Driver.prototype);

_.extend(GmailDriver.prototype, {

	__memberVariables: [
		{name: '_threadMetadataOracle', destroy: false, get: true},
		{name: '_fullscreenViewDriverStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_rowListViewDriverStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_threadRowViewDriverStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_threadViewDriverStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_toolbarViewDriverStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_composeViewDriverStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_xhrInterceptorStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_messageViewDriverStream', destroy: true, get: true, destroyFunction: 'end'}
	],

	showCustomFullscreenView: function(element){
		require('./gmail-driver/show-custom-fullscreen-view')(this, element);
	},

	showNativeFullscreenView: function(){
		require('./gmail-driver/show-native-fullscreen-view')(this);
	},

	getNativeViewNames: function(){
		return require('./views/gmail-fullscreen-view/gmail-fullscreen-view-names').GMAIL_VIEWS;
	},

	createLink: function(viewName, params){
		return require('./gmail-driver/create-link')(this, viewName, params);
	},

	gotoView: function(viewName, params){
		return require('./gmail-driver/goto-view')(this, viewName, params);
	},

	openComposeWindow: function(){
		require('./gmail-driver/open-compose-window')(this);
	},

	createModalView: function(options){
		return new GmailModalView(options);
	},

	_setupEventStreams: function(){
		var result = makeXhrInterceptor();
		var xhrInterceptStream = result.xhrInterceptStream;
		this._threadMetadataOracle = result.threadMetadataOracle;

		this._xhrInterceptorStream = new Bacon.Bus();
		this._xhrInterceptorStream.plug(xhrInterceptStream);

		require('./gmail-driver/setup-fullscreen-view-driver-stream')(this);

		this._rowListViewDriverStream = this._setupFullscreenSubViewDriver('newGmailRowlistView');
		this._threadRowViewDriverStream = this._setupFullscreenSubViewDriver('newGmailThreadRowView');
		this._threadViewDriverStream = this._setupFullscreenSubViewDriver('newGmailThreadView');

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

	_setupFullscreenSubViewDriver: function(viewName){
		var bus = new Bacon.Bus();

		bus.plug(
			this._fullscreenViewDriverStream.flatMap(function(gmailFullscreenView){
				return gmailFullscreenView.getEventStream().filter(function(event){
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
					return event.eventName === 'messageLoaded';
				})
				.map(function(event){
					return event.view;
				});
			})
		);
	}

});

module.exports = GmailDriver;
