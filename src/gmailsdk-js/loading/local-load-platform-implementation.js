var RSVP = require('rsvp');
var _ = require('lodash');

module.exports = _.once(function() {
	var appId = this._appId;

	return new RSVP.Promise(function(resolve, reject) {
	    setTimeout(function() {
	      require('../../platform-implementation-js/main.js');

	      resolve(global.__GmailSDKImpLoader.load("0.1", appId));
	    }, 500);
	  });
});

