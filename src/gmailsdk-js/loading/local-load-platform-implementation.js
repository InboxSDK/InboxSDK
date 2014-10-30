var RSVP = require('rsvp');
var _ = require('lodash');

module.exports = _.once(function() {
	return new RSVP.Promise(function(resolve, reject) {
	    setTimeout(function() {
	      require('../platform-implementation-js/main.js');
	      resolve();
	    }, 500);
	  });
});

