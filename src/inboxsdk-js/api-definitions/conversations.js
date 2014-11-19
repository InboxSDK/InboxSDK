var _ = require('lodash');

var Conversations = function(platformImplementationLoader){
	this._platformImplementationLoader = platformImplementationLoader;
};

_.extend(Conversations.prototype, {

	registerThreadViewHandler: function(handler){
		return this._platformImplementationLoader.registerHandler('Conversations', 'ThreadView', handler);
	},

	registerMessageViewHandler: function(handler){
		return this._platformImplementationLoader.registerHandler('Conversations', 'MessageView', handler);		
	}

});

module.exports = Conversations;
