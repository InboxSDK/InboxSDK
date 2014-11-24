var _ = require('lodash');

/**
* @class
* This namespace provides all the access to the messages and threads of a users inbox.
* Typically, you'll register a handler to be notified when a thread or message becomes "active" and then
* take some appropriate action on that thread or message like adding UI components or analyzing the contents
* relevant to your application.
*/
var Conversations = function(platformImplementationLoader){
	this._platformImplementationLoader = platformImplementationLoader;
};

_.extend(Conversations.prototype, /** @lends Conversations */ {

	/**
	* registers a handler to be notified when a ThreadView is displayed to the user
	* @param handler {function(ThreadView)} the function to be called
	* @return {void}
	*/
	registerThreadViewHandler: function(handler){
		return this._platformImplementationLoader.registerHandler('Conversations', 'ThreadView', handler);
	},

	/**
	* registers a handler to be notified when a MessageView is displayed to the user
	* @param handler {function(ThreadView)} the function to be called
	* @return {void}
	*/
	registerMessageViewHandler: function(handler){
		return this._platformImplementationLoader.registerHandler('Conversations', 'MessageView', handler);
	}

});

module.exports = Conversations;
