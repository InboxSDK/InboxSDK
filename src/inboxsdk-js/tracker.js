var RSVP = require('rsvp');
var assert = require('assert');
var logErrorFactory = require('../common/log-error-factory');

function Tracker(platformImplementationLoader, opts) {
  this._platformImplementationLoader = platformImplementationLoader;

  function reporter() {
    var args = arguments;
    return platformImplementationLoader.load().then(function(Imp) {
      return Imp.Utils.logErrorToServer.apply(Imp.Utils, args);
    });
  }
  this.logError = require('../common/log-error-factory')(reporter);

  var self = this;
  if (opts.globalErrorLogging) {
    if (!RSVP._errorHandlerSetup) {
      RSVP._errorHandlerSetup = true;
      RSVP.on('error', function(err) {
        self.logError("Possibly uncaught promise rejection", err);
      });
    }

    window.addEventListener('error', function(event) {
      // Ugh, currently Chrome makes this pretty useless. The implementation
      // script handles setting up more hooks.
      if (event.error) {
        self.logError("Uncaught exception", event.error);
      }
    });
  } else {
    // Even if we're set not to log errors, we should still avoid letting RSVP
    // swallow errors entirely.
    if (!RSVP._errorHandlerSetup) {
      RSVP._errorHandlerSetup = true;
      RSVP.on('error', function(err) {
        setTimeout(function() {
          throw err;
        }, 1);
      });
    }
  }
}

Tracker.prototype.track = function(eventName, details) {
  assert.equal(typeof eventName, 'string', 'eventName must be a string');
  if (details) {
    assert.equal(typeof details, 'object', 'details must be an object');
    // Make sure it's JSON encodable
    JSON.stringify(details);
  }

  if (arguments.length > 2) {
    throw new Error("Too many parameters");
  }
  this._platformImplementationLoader.load().then(function(Imp) {
    Imp.Utils.track(eventName, details);
  });
};

module.exports = Tracker;
