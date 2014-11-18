var _ = require('lodash');

var Conversations = function(platformImplementationLoader){
	this._platformImplementationLoader = platformImplementationLoader;
};

_.extend(Conversations.prototype, {

	on: function(event, callback){
		var self = this;
		this._platformImplementationLoader.load().then(function(platformImplementation){
			platformImplementation.Conversations.on(event, callback);
		});

		return this;
	}

});

module.exports = Conversations;
