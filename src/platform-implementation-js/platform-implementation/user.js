var _ = require('lodash');


/**
* @class
* This namespace contains methods and types related to the currently logged in user
*/
var User = function(appId, driver){
	this._appId = appId;
	this._driver = driver;
};

_.extend(User.prototype, /** @lends User */ {

	/**
  * Get the email address of the currently logged in user
  * @return {string} an email address
  */
	getEmailAddress: function() {
		return this._driver.getUserEmailAddress();
	}

});

module.exports = User;
