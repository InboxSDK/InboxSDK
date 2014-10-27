var RSVP = require('RSVP');
RSVP.on('error', function(err) {
  process.nextTick(function() {
    throw err;
  });
});
