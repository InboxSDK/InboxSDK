var RSVP = require('RSVP');
var logError = require('./log-error');

function setupGlobalLogger() {
  RSVP._errorHandlerSetup = true;
  RSVP.on('error', function(err) {
    logError("Possibly uncaught promise rejection", err);
  });

  window.addEventListener('error', function(event) {
    // Ugh, Chrome makes this useless currently. TODO work around and wrap
    // functions with our own error handling.
    logError("Uncaught exception", event.error);
  });
}


exports.setupGlobalLogger = setupGlobalLogger;
