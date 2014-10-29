var RSVP = require('RSVP');

module.exports.setup = function() {
  RSVP.on('error', function(err) {
    process.nextTick(function() {
      throw err;
    });
  });
};
