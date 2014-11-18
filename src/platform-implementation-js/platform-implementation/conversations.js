var _ = require('lodash');
var RSVP = require('rsvp');

var EventEmitter = require('events').EventEmitter;

var ThreadView = require('../views/thread-view');
var MessageView = require('../views/message-view');
var AttachmentCardView = require('../views/attachment-card-view');

var Conversations = function(appId, driver){
	EventEmitter.call(this);

	this._appId = appId;
	this._driver = driver;

	this._setupViewDriverWatchers();
};

Conversations.prototype = Object.create(EventEmitter.prototype);

_.extend(Conversations.prototype, {

	_setupViewDriverWatchers: function(){
		this._setupViewDriverWatcher('getThreadViewDriverStream', ThreadView, 'threadOpen');
		this._setupViewDriverWatcher('getMessageViewDriverStream', MessageView, 'messageOpen');
	},

	_setupViewDriverWatcher: function(driverStreamGetFunction, viewClass, eventName){
		var self = this;
		this._driver[driverStreamGetFunction]().onValue(function(viewDriver){
			var view = new viewClass(viewDriver);
			self.emit(eventName, view);
		});
	}

});

module.exports = Conversations;
