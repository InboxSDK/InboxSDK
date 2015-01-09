'use strict';

var _ = require('lodash');

var Map = require('es6-unweak-collections').Map;

var ThreadView = require('../views/conversations/thread-view');
var MessageView = require('../views/conversations/message-view');

var HandlerRegistry = require('../lib/handler-registry');

var memberMap = new Map();
var membraneMap = new Map();

var Conversations = function(appId, driver){
	var members = {};
	memberMap.set(this, members);

	members.appId = appId;
	members.driver = driver;

	members.threadViewHandlerRegistry = new HandlerRegistry();
	members.messageViewHandlerRegistry = new HandlerRegistry();

	_setupViewDriverWatcher(appId, driver.getThreadViewDriverStream(), ThreadView, members.threadViewHandlerRegistry);
	_setupViewDriverWatcher(appId, driver.getMessageViewDriverStream(), MessageView, members.messageViewHandlerRegistry);
};

_.extend(Conversations.prototype, {

	registerThreadViewHandler: function(handler){
		return memberMap.get(this).threadViewHandlerRegistry.registerHandler(handler);
	},

	registerMessageViewHandler: function(handler){
		return memberMap.get(this).messageViewHandlerRegistry.registerHandler(handler);
	}

});

function _setupViewDriverWatcher(appId, stream, ViewClass, handlerRegistry){
	var combinedStream = stream.map(function(viewDriver){
		return {
			viewDriver: viewDriver,
			view: new ViewClass(viewDriver, appId, membraneMap)
		};
	});

	combinedStream.onValue(function(event){
		membraneMap.set(event.viewDriver, event.view);

		event.view.on('unload', function(){
			membraneMap.delete(event.viewDriver);
		});
	});


	combinedStream.delay(0).onValue(function(event){
		handlerRegistry.addTarget(event.view);
	});
}


module.exports = Conversations;
