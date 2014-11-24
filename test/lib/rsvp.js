var RSVP = require("rsvp");

RSVP._errorHandlerSetup = true;
RSVP.on('error', function(e) {
  console.error("Possibly uncaught promise rejection");

  // throwing directly inside the RSVP callback breaks RSVP.
  process.nextTick(function() {
    throw e;
  });
});

module.exports = RSVP;
