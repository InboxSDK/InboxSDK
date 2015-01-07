var _ = require('lodash');

var User = function(appId, driver){
	this._appId = appId;
	this._driver = driver;
};

_.extend(User.prototype, {

	getEmailAddress: function() {
		return this._driver.getUserEmailAddress();
	}

});

module.exports = User;
