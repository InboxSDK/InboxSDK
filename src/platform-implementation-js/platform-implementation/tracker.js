var _ = require('lodash');
var Ajax = require('../../common/ajax');
var RSVP = require('rsvp');
var logErrorFactory = require('../../common/log-error-factory');

function Tracker(appId, opts) {
  this._appId = appId;
  this._email = null;

  this.logError = logErrorFactory(this.logErrorToServer.bind(this));

  // Set up error logging.
  var self = this;
  if (opts.globalErrorLogging) {
    if (!RSVP._errorHandlerSetup) {
      RSVP._errorHandlerSetup = true;
      RSVP.on('error', function(err) {
        self.logError("Possibly uncaught promise rejection", err);
      });
    }

    window.addEventListener('error', function(event) {
      // Ugh, currently Chrome makes this pretty useless. TODO copy a bunch of
      // Streak's error-tracking code into this file.
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

Tracker.prototype.setEmail = function(email) {
  this._email = email;
};

Tracker.prototype._getUserEmailAddressAsync = function() {
  if (this._email) {
    return this._email.getUserAsync().catch(function(err) {
      return null;
    }).then(function(user) {
      return user ? user.emailAddress : null;
    });
  } else {
    return RSVP.Promise.resolve(null);
  }
};

Tracker.prototype.logErrorToServer = function(reporterExtras, name, err, details) {
  return this._getUserEmailAddressAsync().then(function(email) {
    var stringReport = _.map(reporterExtras.stuffToLog, function(piece) {
      if (typeof piece == 'string') {
        return piece;
      } else if (piece instanceof Error && piece.message) {
        return piece.message;
      } else {
        try {
          return JSON.stringify(piece);
        } catch(e) {
          return '((Could not convert to JSON))';
        }
      }
    }).join(' ');
    return Ajax({
      url: 'https://events.inboxsdk.com/api/v2/errors',
      method: 'POST',
      data: {
        error: stringReport,
        email: email
      }
    });
  });
};

Tracker.prototype.track = function(eventName, details) {
  this._getUserEmailAddressAsync().then(function(email) {
    details = _.extend({
      'timestamp': new Date().getTime()*1000,
      'screenWidth': screen.width,
      'screenHeight': screen.height,
      'windowWidth': window.innerWidth,
      'windowHeight': window.innerHeight,
      'origin': document.location.origin,
      'email': email
    }, details);

    // TODO queue a bunch before sending
    var events = [details];

    return Ajax({
      url: 'https://events.inboxsdk.com/api/v2/track',
      method: 'POST',
      data: {
        json: JSON.stringify({
          data: events,
          clientRequestTimestamp: new Date().getTime()*1000
        })
      }
    });
  });
};

module.exports = Tracker;
