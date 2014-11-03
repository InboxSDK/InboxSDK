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
	}

});

module.exports = Views;
