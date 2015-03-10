var _ = require('lodash');

var User = function(appId, driver){
	this._appId = appId;
	this._driver = driver;
};

_.extend(User.prototype, {

	/* this is being used by screenleap*/
	getEmailAddress: function() {
		return this._driver.getUserEmailAddress();
	}

});

module.exports = User;
