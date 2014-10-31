var RSVP = require('rsvp');
var _ = require('lodash');

module.exports = function(delay) {
	return function() {
		return new RSVP.Promise(function(resolve, reject) {
			setTimeout(function() {
				require('../../platform-implementation-js/main.js');
				resolve();
			}, delay);
		});
	};
};
