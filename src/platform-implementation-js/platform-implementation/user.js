var _ = require('lodash');

// documented in src/docs/
var User = function(appId, driver){
	this._appId = appId;
	this._driver = driver;
};

_.extend(User.prototype, {

	getEmailAddress() {
		return this._driver.getUserEmailAddress();
	},

	getUserContact() {
		this._driver.getLogger().deprecationWarning('User.getUserContact', 'User.getEmailAddress');
		return this._driver.getUserContact();
	},

	getAccountSwitcherContactList() {
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
