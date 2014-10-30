var RSVP = require('RSVP');
var logError = require('./log-error');

function setup() {
  // In single build mode, RSVP already has an error handler attached.
  if (!RSVP._errorHandlerSetup) {
    RSVP._errorHandlerSetup = true;
    RSVP.on('error', function(err) {
      logError("Possibly uncaught promise rejection", err);
    });
  }
}

exports.setup = setup;
