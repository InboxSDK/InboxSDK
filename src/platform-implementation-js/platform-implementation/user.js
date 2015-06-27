var _ = require('lodash');
var depWarn = require('../lib/dep-warn');

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
		return this._driver.getUserEmailAddress();
	},

	/*(deprecated)
	 * Get the details of the currently logged in user.
	 * @return {Contact}
	 */
	getUserContact: function() {
		depWarn('User.getUserContact is deprecated. Use User.getEmailAddress instead.');
		return this._driver.getUserContact();
	},

	/**
	 * Get the details of all of the user's accounts from the account switcher.
	 * @return {Contact[]}
	 */
	getAccountSwitcherContactList: function() {
		var list = this._driver.getAccountSwitcherContactList();
		var userEmail = this.getEmailAddress();
		var listHasUser = !!_.find(list, item => item.emailAddress === userEmail);
		if (!listHasUser) {
			// This happens for delegated accounts.
			list = list.concat([{name: userEmail, emailAddress: userEmail}]);
		}
		return list;
	}

});

module.exports = User;
