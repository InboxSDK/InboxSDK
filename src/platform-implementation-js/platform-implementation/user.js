var _ = require('lodash');


/**
* @class
* This namespace contains methods and types related to the currently logged in user.
*/
var User = function(appId, driver){
	this._appId = appId;
	this._driver = driver;
};

_.extend(User.prototype, /** @lends User */ {

	/**
	 * Get the email address of the currently logged in user.
	 * @return {string} an email address
	 */
	getEmailAddress: function() {
		return this._driver.getUserContact().emailAddress;
	},

	/**
	 * Get the details of the currently logged in user.
	 * @return {Contact}
	 */
	getUserContact: function() {
		return this._driver.getUserContact();
	},

	/**
	 * Get the details of all of the user's accounts from the account switcher.
	 * @return {Contact[]}
	 */
	getAccountSwitcherContactList: function() {
		return this._driver.getAccountSwitcherContactList();
	}

});

module.exports = User;
