var RSVP = require('rsvp');
var getStackTrace = require('./get-stack-trace');

// Both gmailsdk.js and platform-implementation.js need logError() functions,
// but they work differently. We want the reporting the error to the server to
// be done by the implementation, but we need gmailsdk.js to be able to show an
// error without depending on the implementation and to remember its initial
// stack trace without an async step. The implementation needs that too, so both
// of those parts are implemented here once. Each bundle includes this file and
// passes its own report-to-server function to the logErrorFactory in order to
// generate their own versions of the logError function.

function logErrorFactory(reporter) {
  return function logError(name, err, details) {
    var args = arguments;

    // It's important that we can't throw an error or leave a rejected promise
    // unheard while logging an error in order to make sure to avoid ever
    // getting into an infinite loop of reporting uncaught errors.
    try {
      // Might not have been passed a useful error object with a stack, so get
      // our own current stack just in case.
      var nowStack = getStackTrace();

      // Show the error immediately, don't wait on implementation load for that.
      var stuffToLog = ["Got an error", err];
      if (err && err.stack) {
        stuffToLog = stuffToLog.concat(["\n\nOriginal error stack", err.stack]);
      }
      if (details) {
        stuffToLog = stuffToLog.concat(["\n\nError details", details]);
      }
      stuffToLog = stuffToLog.concat(["\n\nError logged from", nowStack]);

      console.error.apply(console, stuffToLog);

      RSVP.resolve().then(function() {
        // Pass the error on to the implementation which will handle logging it
        // to the server. It might return a promise, so we need to make sure it
        // has a rejection listener so that it can't cause an uncaught error to
        // be logged recursively.
        return reporter(nowStack, name, err, details);
      }).catch(function(err2) {
        tooManyErrors(err2, args);
      });
    } catch(err2) {
      tooManyErrors(err2, args);
    }
  };
}

function tooManyErrors(err2, originalArgs) {
  console.error("ERROR REPORTING ERROR", err2);
  console.error("ORIGINAL ERROR", originalArgs);
}

module.exports = logErrorFactory;
