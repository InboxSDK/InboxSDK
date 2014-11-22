var _ = require('lodash');
var Bacon = require('baconjs');

require('./custom-style');

var Driver = require('../../driver-interfaces/driver');
var GmailElementGetter = require('./gmail-element-getter');
var makeXhrInterceptorStream = require('./make-xhr-interceptor-stream');
var GmailThreadView = require('./views/gmail-thread-view');

var GmailModalView = require('./widgets/gmail-modal-view');


var GmailDriver = function(){
	Driver.call(this);

	this._setupEventStreams();
};

GmailDriver.prototype = Object.create(Driver.prototype);

_.extend(GmailDriver.prototype, {

	__memberVariables: [
		{name: '_fullscreenViewDriverStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_rowListViewDriverStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_threadViewDriverStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_toolbarViewDriverStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_composeViewDriverStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_xhrInterceptorStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_messageViewDriverStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_attachmentCardViewDriverStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_standardThreadViewMonitor', destroy: true},
		{name: '_previewPaneThreadViewMonitor', destroy: true},
		{name: '_standardThreadListToolbarMonitor', destroy: true},
		{name: '_previewPaneThreadListToolbarMonitor', destroy: true},
		{name: '_threadViewToolbarMonitor', destroy: true}
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
		this._xhrInterceptorStream = new Bacon.Bus();
		this._xhrInterceptorStream.plug(makeXhrInterceptorStream());

		require('./gmail-driver/setup-fullscreen-view-driver-stream')(this);

		this._setupRowListViewDriverStream();
		this._setupThreadViewDriverStream();
		this._setupToolbarViewDriverStream();
		this._setupMessageViewDriverStream();
		this._setupAttachmentCardViewDriverStream();
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

	_setupRowListViewDriverStream: function(){
		this._rowListViewDriverStream = new Bacon.Bus();

		this._rowListViewDriverStream.plug(
			this._fullscreenViewDriverStream.flatMap(function(gmailFullscreenView){
				return gmailFullscreenView.getEventStream().filter(function(event){
					return event.eventName === 'newGmailRowListView';
				})
				.map(function(event){
					return event.view;
				});
			})
		);
	},

	/* getThreadViewDriverStream: function(){
		// we debounce because preview pane and standard thread watching can throw off
		// events for the same thread in certain edge cases
		// (namely preview pane active, but refreshing in thread view)
		return this._threadViewDriverStream.debounceImmediate(20);
	},*/

	_setupThreadViewDriverStream: function(){
		this._threadViewDriverStream = new Bacon.Bus();

		this._threadViewDriverStream.plug(
			this._fullscreenViewDriverStream.flatMap(function(gmailFullscreenView){
				return gmailFullscreenView.getEventStream().filter(function(event){
					return event.eventName === 'newGmailThreadView';
				})
				.map(function(event){
					return event.view;
				});
			})
		);
	},

	/* getToolbarViewDriverStream: function(){
		// we debounce because preview pane and standard thread watching can throw off
		// events for the same thread in certain edge cases
		// (namely preview pane active, but refreshing in thread view)
		return this._toolbarViewDriverStream.debounceImmediate(20);
	}, */

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
	},

	_setupAttachmentCardViewDriverStream: function(){
		this._attachmentCardViewDriverStream = new Bacon.Bus();

		this._attachmentCardViewDriverStream.plug(
			this._messageViewDriverStream.flatMap(function(gmailMessageView){
				return gmailMessageView.getEventStream().filter(function(event){
					return event.eventName === 'newAttachmentCard';
				})
				.map(function(event){
					return event.view;
				});
			})
		);
	}

});

module.exports = GmailDriver;
