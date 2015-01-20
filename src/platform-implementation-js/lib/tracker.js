var _ = require('lodash');
var ajax = require('../../common/ajax');
var crypto = require('crypto');
var RSVP = require('rsvp');
var getStackTrace = require('../../common/get-stack-trace');

var tracker = {};
module.exports = tracker;

// Yeah, this module has some shared state. This is just for logging
// convenience. Other modules should avoid doing this!
var _appIds = [];
var _LOADER_VERSION;
var _IMPL_VERSION;
var _userEmailHash;

var _seenErrors = typeof WeakSet == 'undefined' ? null : new WeakSet();

function haveWeSeenThisErrorAlready(error) {
  if (error && typeof error == 'object') {
    if (_seenErrors) {
      return _seenErrors.has(error);
    } else {
      return error.__alreadyLoggedBySDK;
    }
  }
  return false;
}

function markErrorAsSeen(error) {
  if (error && typeof error == 'object') {
    // Prefer to stick the error in a WeakSet over adding a property to it.
    if (_seenErrors) {
      _seenErrors.add(error);
    } else {
      try {
        Object.defineProperty(error, '__alreadyLoggedBySDK', {
          value: true, enumerable: false
        });
      } catch(extraError) {
        // In case we get an immutable exception
      }
    }
  }
}

function tooManyErrors(err2, originalArgs) {
  console.error("ERROR REPORTING ERROR", err2);
  console.error("ORIGINAL ERROR", originalArgs);
}

// err should be an Error instance, and details can be any JSON-ifiable value.
tracker.logError = function(err, details) {
  var args = arguments;

  // It's important that we can't throw an error or leave a rejected promise
  // unheard while logging an error in order to make sure to avoid ever
  // getting into an infinite loop of reporting uncaught errors.
  try {
    if (haveWeSeenThisErrorAlready(err)) {
      return;
    } else {
      markErrorAsSeen(err);
    }

    if (!(err instanceof Error)) {
      console.warn('First parameter to logError was not an error object:', err);
    }

    // Might not have been passed a useful error object with a stack, so get
    // our own current stack just in case.
    var nowStack = getStackTrace();

    // Show the error immediately, don't wait on implementation load for that.
    var stuffToLog = ["Error logged:", err];
    if (err && err.stack) {
      stuffToLog = stuffToLog.concat(["\n\nOriginal error stack:\n"+err.stack]);
    }
    if (details) {
      stuffToLog = stuffToLog.concat(["\n\nError details:", details]);
    }
    stuffToLog = stuffToLog.concat(["\n\nError logged from:", nowStack]);
    stuffToLog = stuffToLog.concat(["\n\nExtension App Ids:"], _appIds);
    stuffToLog = stuffToLog.concat(["\nInboxSDK Loader Version:"], _LOADER_VERSION);
    stuffToLog = stuffToLog.concat(["\nInboxSDK Implementation Version:"], _IMPL_VERSION);

    console.error.apply(console, stuffToLog);

    var stringReport = _.map(stuffToLog, function(piece) {
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

    ajax({
      url: 'https://events.inboxsdk.com/api/v2/errors',
      method: 'POST',
      data: {
        error: stringReport,
        emailHash: _userEmailHash
      }
    }).catch(function(err2) {
      tooManyErrors(err2, args);
    });
  } catch(err2) {
    tooManyErrors(err2, args);
  }
};

function makeLoggedFunction(func, name) {
  return function() {
    try {
      return func.apply(this, arguments);
    } catch (err) {
      var msg = name ? "Uncaught error in "+name : "Uncaught error";
      tracker.logError(err, msg);
      throw err;
    }
  };
}

function replaceFunction(parent, name, newFnMaker) {
  var newFn = newFnMaker(parent[name]);
  newFn.__original = parent[name];
  parent[name] = newFn;
}

function hash(str) {
  var hasher = crypto.createHash('sha256');
  hasher.update('inboxsdk:'+str);
  return hasher.digest('base64');
}

// Set up error logging.
tracker.setup = function(appId, opts, LOADER_VERSION, IMPL_VERSION) {
  _appIds.push(appId);
  _LOADER_VERSION = LOADER_VERSION;
  _IMPL_VERSION = IMPL_VERSION;

  if (opts.globalErrorLogging) {
    if (Error.stackTraceLimit < 30) {
      Error.stackTraceLimit = 30;
    }

    if (!RSVP._errorHandlerSetup) {
      RSVP._errorHandlerSetup = true;
      RSVP.on('error', function(err) {
        tracker.logError(err, "Possibly uncaught promise rejection");
      });
    }

    window.addEventListener('error', function(event) {
      // Ugh, currently Chrome makes this pretty useless. Once Chrome fixes
      // this, we can remove the logged function wrappers around setTimeout and
      // things.
      if (event.error) {
        tracker.logError(event.error, "Uncaught exception");
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
};

tracker.setUserEmailAddress = function(userEmailAddress) {
  _userEmailHash = hash(userEmailAddress);
};

tracker.track = function(eventName, details) {
  details = _.extend({
    'timestamp': new Date().getTime()*1000,
    'screenWidth': screen.width,
    'screenHeight': screen.height,
    'windowWidth': window.innerWidth,
    'windowHeight': window.innerHeight,
    'origin': document.location.origin,
    'emailHash': _userEmailHash
  }, details);

  // TODO queue a bunch before sending
  var events = [details];

  return ajax({
    url: 'https://events.inboxsdk.com/api/v2/track',
    method: 'POST',
    data: {
      json: JSON.stringify({
        data: events,
        clientRequestTimestamp: new Date().getTime()*1000
      })
    }
  });
};

// For tracking app events that are possibly triggered by the user. Extensions
// can opt out of this with a flag passed to InboxSDK.load().
tracker.trackAppActive = function(eventName, detail) {
  console.log('trackActive', eventName, detail);
};

// Track events unrelated to user activity about how the app uses the SDK.
// Examples include the app being initialized, and calls to any of the
// register___ViewHandler functions.
tracker.trackAppPassive = function(eventName, detail) {
  console.log('trackPassive', eventName, detail);
};

// Track Gmail events.
tracker.trackGmail = function(eventName, detail) {
  console.log('trackGmail', eventName, detail);
};
