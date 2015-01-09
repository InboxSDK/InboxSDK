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
	members.messageViewHandlerRegistries = {
		all: new HandlerRegistry(),
		loaded: new HandlerRegistry()
	};

	this.registerMessageViewHandler = this.registerLoadedMessageViewHandler;

	_setupViewDriverWatcher(appId, driver.getThreadViewDriverStream(), ThreadView, members.threadViewHandlerRegistry);
	_setupViewDriverWatcher(appId, driver.getMessageViewDriverStream(), MessageView, members.messageViewHandlerRegistries.all);

	_setupViewDriverWatcher(
		appId,
		driver.getMessageViewDriverStream().flatMap(function(messageViewDriver){
			return messageViewDriver.getEventStream()
									.filter(function(event){
										return event.eventName === 'messageLoaded';
									})
									.map('.view');
		}),
		MessageView,
		members.messageViewHandlerRegistries.loaded
	);

	this.MessageViewStates = {};
	Object.defineProperties(this.MessageViewStates, {
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

	registerMessageAllViewHandler: function(handler){
		return memberMap.get(this). messageViewHandlerRegistry.registerHandler(handler);
	},

	registerMessageViewDataLoadedHandler: function(handler){
		return memberMap.get(this).messageViewHandlerRegistry.registerHandler(handler);
	}

});

function _setupViewDriverWatcher(appId, stream, ViewClass, handlerRegistry){
	var combinedStream = stream.map(function(viewDriver){
		var view = membraneMap.get(viewDriver) || new ViewClass(viewDriver, appId, membraneMap);

		return {
			viewDriver: viewDriver,
			view: view
		};
	});

	combinedStream.onValue(function(event){
		if(!membraneMap.has(event.viewDriver)){
			membraneMap.set(event.viewDriver, event.view);

			event.view.on('unload', function(){
				membraneMap.delete(event.viewDriver);
			});
		}
	});


	combinedStream.delay(0).onValue(function(event){
		handlerRegistry.addTarget(event.view);
	});
}


module.exports = Conversations;
