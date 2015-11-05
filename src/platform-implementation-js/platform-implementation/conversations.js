'use strict';

var _ = require('lodash');
var Bacon = require('baconjs');

var ThreadView = require('../views/conversations/thread-view');
var MessageView = require('../views/conversations/message-view');

var HandlerRegistry = require('../lib/handler-registry');

var memberMap = new WeakMap();

// documented in src/docs/
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
	driver.getStopper().onValue(function() {
		members.threadViewHandlerRegistry.dumpHandlers();
		members.messageViewHandlerRegistries.all.dumpHandlers();
		members.messageViewHandlerRegistries.loaded.dumpHandlers();
	});

	_setupViewDriverWatcher(appId, driver.getThreadViewDriverStream(), ThreadView, members.threadViewHandlerRegistry, this, membraneMap, driver);
	_setupViewDriverWatcher(appId, driver.getMessageViewDriverStream(), MessageView, members.messageViewHandlerRegistries.all, this, membraneMap, driver);

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
		membraneMap,
		driver
	);

	this.MessageViewViewStates = Object.freeze({
		'HIDDEN': "HIDDEN",
		'COLLAPSED': "COLLAPSED",
		'EXPANDED': "EXPANDED"
	});
};


_.extend(Conversations.prototype, {

	registerThreadViewHandler(handler){
		return memberMap.get(this).threadViewHandlerRegistry.registerHandler(handler);
	},

	registerMessageViewHandler(handler){
		return memberMap.get(this).messageViewHandlerRegistries.loaded.registerHandler(handler);
	},

	registerMessageViewHandlerAll(handler){
		return memberMap.get(this).messageViewHandlerRegistries.all.registerHandler(handler);
	}

});

function _setupViewDriverWatcher(appId, stream, ViewClass, handlerRegistry, ConversationsInstance, membraneMap, driver){
	var combinedStream = stream.map(function(viewDriver){
		var view = membraneMap.get(viewDriver);
		if (!view) {
			view = new ViewClass(viewDriver, appId, membraneMap, ConversationsInstance, driver);
			membraneMap.set(viewDriver, view);
		}

		return {
			viewDriver: viewDriver,
			view: view
		};
	});

	combinedStream.flatMap(function(event) {
		return Bacon.later(0)
			.takeUntil(Bacon.fromEvent(event.view, 'destroy'))
			.map(() => event);
	}).onValue(function(event) {
		handlerRegistry.addTarget(event.view);
	});
}

module.exports = Conversations;
