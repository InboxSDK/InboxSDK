var _ = require('lodash');

var Views = function(platformImplementationLoader){
	this._platformImplementationLoader = platformImplementationLoader;
};

_.extend(Views.prototype, {

	on: function(event, callback){
		var self = this;
		this._platformImplementationLoader.load().then(function(platformImplementation){
			platformImplementation.Views.on(event, callback);
		});

		return this;
	},

	getComposeView: function(){
		var self = this;
		return this._platformImplementationLoader.load().then(function(platformImplementation){

			return platformImplementation.Views.getComposeView();

		});

	}

});

module.exports = Views;
