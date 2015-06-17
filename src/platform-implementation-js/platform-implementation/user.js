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
		var list = this._driver.getAccountSwitcherContactList();
		var user = this.getUserContact();
		var listHasUser = !!_.find(list, item => item.emailAddress === user.emailAddress);
		if (!listHasUser) {
			this._driver.getLogger().error(
				new Error("Account switcher list did not contain user"),
				{listLength: list.length}
			);
			list = list.concat([user]);
		}
		return list;
	}

});

module.exports = User;
