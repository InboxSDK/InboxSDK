var _ = require('lodash');
var $ = require('jquery');
var RSVP = require('rsvp');

var Email = function(appId, driver){
	this._appId = appId;
	this._driver = driver;
};

_.extend(Email.prototype, {

	getUserAsync: function() {
		throw new Error("Not implemented");
		// return RSVP.Promise.resolve({
		// 	displayName: 'Bob Example',
		// 	emailAddress: 'bob@example.com'
		// });
	},

	getUserEmailAddress: function() {
		return this._driver.getUserEmailAddress();
	}

});

module.exports = Email;
