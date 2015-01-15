'use strict';

var _ = require('lodash');

var Map = require('es6-unweak-collections').Map;

var ThreadView = require('../views/conversations/thread-view');
var MessageView = require('../views/conversations/message-view');

var HandlerRegistry = require('../lib/handler-registry');

var memberMap = new Map();
var membraneMap = new Map();

/**
* @class
* This namespace allows you to interact with Gmail and Inbox conversations (typically called threads). The fundamental
* views you interact with are ThreadView and MessageView and there is a 1 to many relationship between them. The functions
* in Conversationns.* allow you to obtain these views which you can then further manipulate.
*
* It's important to note that ThreadViews and MessageViews can be navigated to in various ways by the user depending on their
* email client and their settings (i.e. preview pane on in Gmail). This is abstracted completely away from you so you can just
* focus on manipulating the views once they are given to you.
*
* Finally, when a ThreadView loads, you're not guranteed that every MessageView in it is also loaded. When you call
* ThreadView.getMessageViews it will return all MessageViews, but its important to remember that the MessageViews might not
* be loaded. MessageViews can be in several states. Consult the <code>MessageView</code> documentation to learn about what
* functionality is available in each state.
*/
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

	_setupViewDriverWatcher(appId, driver.getThreadViewDriverStream(), ThreadView, members.threadViewHandlerRegistry, this);
	_setupViewDriverWatcher(appId, driver.getMessageViewDriverStream(), MessageView, members.messageViewHandlerRegistries.all, this);

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
		members.messageViewHandlerRegistries.loaded
	);

	/**
	* enum^The various UI states a MessageView can be in
	* @class
	* @name MessageViewViewStates
	*/
	this.MessageViewViewStates = {};
	Object.defineProperties(this.MessageViewViewStates, /**@lends MessageViewViewStates */ {
		/**
		* in this state none of the message is visible except for the outline of its existence
		* @type string
		*/
		'HIDDEN': {
			value: ["HIDDEN"],
			writable: false
		},
		/**
		* in this state most of the body of the message is not visible and some recipients may not be showing
		* @type string
		*/
		'COLLAPSED': {
			value: ["COLLAPSED"],
			writable: false
		},
		/**
		* in this state all of the message is visible including the body
		* @type string
		*/
		'EXPANDED': {
			value: ["EXPANDED"],
			writable: false
		}
	});
};


_.extend(Conversations.prototype, /** @lends Conversations */{

	/**
	* Registers your handler to be called when the user navigates to a ThreadView. Your handler is given a
	* ThreadView which you can then further manipulate.
	* @param {function(threadView)} handler - the handler to call when a ThreadView is displayed. This handler
	* is passed one parameter, a ThreadView
	* @return {void}
	*/
	registerThreadViewHandler: function(handler){
		return memberMap.get(this).threadViewHandlerRegistry.registerHandler(handler);
	},

	/**
	* Registers your handler to be called when the user navigates to a MessageView. Your handler is given a
	* MessageView which you can then further manipulate.
	*
	* IMPORTANT: Your handler will only be called for MessageViews that are "loaded". See docs for
	* <code>MessageView</code> to understand the distinction.
	* @param {function(messageView)} handler - the handler to call when a MessageView is displayed. This handler
	* is passed one parameter, a MessageView
	* @return {void}
	*/
	registerMessageViewHandler: function(handler){
		return memberMap.get(this).messageViewHandlerRegistries.loaded.registerHandler(handler);
	},

	/**
	* Registers your handler to be called when the user navigates to a MessageView. Your handler is given a
	* MessageView which you can then further manipulate.
	*
	* IMPORTANT: Your handler will be called for MessageViews that are both "loaded" and "unloaded". See docs for
	* <code>MessageView</code> to understand the distinction.
	* @param {function(messageView)} handler - the handler to call when a MessageView is displayed. This handler
	* is passed one parameter, a MessageView
	* @return {void}
	*/
	registerMessageViewHandlerAll: function(handler){
		return memberMap.get(this).messageViewHandlerRegistries.all.registerHandler(handler);
	}

});

function _setupViewDriverWatcher(appId, stream, ViewClass, handlerRegistry, ConversationsInstance){
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
