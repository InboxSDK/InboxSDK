var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

var ComposeView = require('./views/compose-view');
var ThreadView = require('./views/thread-view');
var MessageView = require('./views/message-view');
var AttachmentCardView = require('./views/attachment-card-view');

var Views = function(appId, driver){
	EventEmitter.call(this);

	this._appId = appId;
	this._driver = driver;

	this._setupViewDriverWatchers();
};

Views.prototype = Object.create(EventEmitter.prototype);

_.extend(Views.prototype, {

	_setupViewDriverWatchers: function(){
		this._setupViewDriverWatcher('getThreadViewDriverStream', ThreadView, 'threadOpen');
		this._setupViewDriverWatcher('getComposeViewDriverStream', ComposeView, 'composeOpen');
		this._setupViewDriverWatcher('getMessageViewDriverStream', MessageView, 'messageOpen');
		this._setupViewDriverWatcher('getAttachmentCardViewDriverStream', ThreadView, 'attachmentCardOpen');
	},

	_setupViewDriverWatcher: function(driverStreamGetFunction, viewClass, eventName){
		var self = this;
		this._driver[driverStreamGetFunction]().onValue(function(viewDriver){
			var view = new viewClass(viewDriver);
			self.emit(eventName, view);
		});
	}

});

module.exports = Views;
