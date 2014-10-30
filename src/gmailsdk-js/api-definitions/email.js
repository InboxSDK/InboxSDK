var _ = require('lodash');

var Email = function(platformImplementationLoader){
	this._platformImplementationLoader = platformImplementationLoader;
};

_.extend(Email.prototype, {

	getUserAsync: function() {
		this._platformImplementationLoader.load().then(function(platformImplementation) {
			return platformImplementation.Email.getUserAsync();
		});
  	}

});


module.exports = Email;
