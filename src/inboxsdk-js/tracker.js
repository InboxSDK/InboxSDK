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
  this.logError = logErrorFactory(reporter);

  // Rethrow any RSVP errors.
  if (!RSVP._errorHandlerSetup) {
    RSVP._errorHandlerSetup = true;
    RSVP.on('error', function(err) {
      setTimeout(function() {
        throw err;
      }, 1);
    });
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
