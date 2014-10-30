var _ = require('lodash');
var $ = require('jquery');

var Email = function(appId, driver){
	this._appId = appId;
	this._driver = driver;
};

_.extend(Email.prototype, {

	getUserAsync: function() {
		return 'bob@example.com';
	}

});

module.exports = Email;
