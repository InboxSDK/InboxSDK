'use strict';

var _ = require('lodash');

var Map = require('es6-unweak-collections').Map;

var ThreadView = require('../views/conversations/thread-view');
var MessageView = require('../views/conversations/message-view');

var HandlerRegistry = require('../lib/handler-registry');

var memberMap = new Map();

var Conversations = function(appId, driver, membraneMap){
	var members = {};
	memberMap.set(this, members);

	members.appId = appId;
	members.driver = driver;
	members.membraneMap = membraneMap;

	members.threadViewHandlerRegistry = new HandlerRegistry();
	members.messageViewHandlerRegistries = {
		all: new HandlerRegistry(),
		loaded: new HandlerRegistry()
	};

	_setupViewDriverWatcher(appId, driver.getThreadViewDriverStream(), ThreadView, members.threadViewHandlerRegistry, this, membraneMap);
	_setupViewDriverWatcher(appId, driver.getMessageViewDriverStream(), MessageView, members.messageViewHandlerRegistries.all, this, membraneMap);

	_setupViewDriverWatcher(
		appId,
		driver.getMessageViewDriverStream().flatMap(function(messageViewDriver){
			return messageViewDriver.getEventStream()
									.filter(function(event){
										return event.eventName === 'messageLoad';
									})
									.map('.view');
		}),
		MessageView,
		members.messageViewHandlerRegistries.loaded,
		this,
		membraneMap
	);

	this.MessageViewViewStates = {};
	Object.defineProperties(this.MessageViewViewStates, {
		'HIDDEN': {
			value: ["HIDDEN"],
			writable: false
		},
		'COLLAPSED': {
			value: ["COLLAPSED"],
			writable: false
		},
		'EXPANDED': {
			value: ["EXPANDED"],
			writable: false
		}
	});
};


_.extend(Conversations.prototype, {

	registerThreadViewHandler: function(handler){
		return memberMap.get(this).threadViewHandlerRegistry.registerHandler(handler);
	},

	registerMessageViewHandlerAll: function(handler){
		return memberMap.get(this).messageViewHandlerRegistries.all.registerHandler(handler);
	},

	registerMessageViewHandler: function(handler){
		return memberMap.get(this).messageViewHandlerRegistries.loaded.registerHandler(handler);
	}

});

function _setupViewDriverWatcher(appId, stream, ViewClass, handlerRegistry, ConversationsInstance, membraneMap){
	var combinedStream = stream.map(function(viewDriver){
		var view = membraneMap.get(viewDriver) || new ViewClass(viewDriver, appId, membraneMap, ConversationsInstance);

		return {
			viewDriver: viewDriver,
			view: view
		};
	});

	combinedStream.onValue(function(event){
		if(!membraneMap.has(event.viewDriver)){
			membraneMap.set(event.viewDriver, event.view);

			event.view.on('destroy', function(){
				membraneMap.delete(event.viewDriver);
			});
		}
	});


	combinedStream.delay(0).onValue(function(event){
		handlerRegistry.addTarget(event.view);
	});
}


module.exports = Conversations;
