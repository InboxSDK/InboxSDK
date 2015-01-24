var _ = require('lodash');
var ajax = require('../../common/ajax');
var RSVP = require('rsvp');
var sha256 = require('sha256');
var getStackTrace = require('../../common/get-stack-trace');
var getExtensionId = require('../../common/get-extension-id');
var PersistentQueue = require('./persistent-queue');
var makeMutationObserverStream = require('./dom/make-mutation-observer-stream');

var tracker = {};
module.exports = tracker;
window.tracker = tracker; // TODO temporary

// Yeah, this module is a singleton with some shared state. This is just for
// logging convenience. Other modules should avoid doing this!
var _appIds = [];
var _LOADER_VERSION;
var _IMPL_VERSION;
var _userEmailHash;
var _useEventTracking;

var _seenErrors = typeof WeakSet == 'undefined' ? null : new WeakSet();

// This will only be true for the first InboxSDK extension to load. This
// first extension is tasked with reporting tracked events to the server.
var _isTrackerMaster = false;
var _sessionId = document.head.getAttribute('data-inboxsdk-session-id');
if (!_sessionId) {
  _sessionId = Date.now()+'-'+Math.random();
  document.head.setAttribute('data-inboxsdk-session-id', _sessionId);
  _isTrackerMaster = true;
}

var _trackedEventsQueue = new PersistentQueue('events');

// Set up error logging.
tracker.setup = function(appId, opts, LOADER_VERSION, IMPL_VERSION) {
  _appIds.push(appId);
  if (_LOADER_VERSION) {
    // If we've been set up before, don't do it all again.
    return;
  }
  _LOADER_VERSION = LOADER_VERSION;
  _IMPL_VERSION = IMPL_VERSION;
  _useEventTracking = opts.eventTracking;

  if (opts.globalErrorLogging) {
    if (Error.stackTraceLimit < 30) {
      Error.stackTraceLimit = 30;
    }

    RSVP.on('error', function(err) {
      tracker.logError(err, "Possibly uncaught promise rejection");
    });

    window.addEventListener('error', function(event) {
      // Ugh, currently Chrome makes this pretty useless. Once Chrome fixes
      // this, we can remove the logged function wrappers around setTimeout and
      // things.
      if (event.error) {
        tracker.logError(event.error, "Uncaught exception");
      }
    });

    replaceFunction(window, 'setTimeout', function(original) {
      return function wrappedSetTimeout() {
        var args = _.toArray(arguments);
        if (typeof args[0] == 'function') {
          args[0] = makeLoggedFunction(args[0], "setTimeout callback");
        }
        return original.apply(this, args);
      };
    });

    replaceFunction(window, 'setInterval', function(original) {
      return function wrappedSetInterval() {
        var args = _.toArray(arguments);
        if (typeof args[0] == 'function') {
          args[0] = makeLoggedFunction(args[0], "setInterval callback");
        }
        return original.apply(this, args);
      };
    });

    var ETp = window.EventTarget ? window.EventTarget.prototype : window.Node.prototype;
    replaceFunction(ETp, 'addEventListener', function(original) {
      return function wrappedAddEventListener() {
        var args = _.toArray(arguments);
        if (typeof args[1] == 'function') {
          try {
            // If we've made a logger for this function before, use it again,
            // otherwise attach it as a property to the original function.
            // This is necessary so that removeEventListener is called with
            // the right function.
            var loggedFn = args[1].__inboxsdk_logged;
            if (!loggedFn) {
              loggedFn = makeLoggedFunction(args[1], "event listener");
              args[1].__inboxsdk_logged = loggedFn;
            }
            args[1] = loggedFn;
          } catch(e) {
            // This could be triggered if the given function was immutable
            // and stopped us from saving the logged copy on it.
            console.error("Failed to error wrap function", e);
          }
        }
        return original.apply(this, args);
      };
    });

    replaceFunction(ETp, 'removeEventListener', function(original) {
      return function wrappedRemoveEventListener() {
        var args = _.toArray(arguments);
        if (typeof args[1] == 'function' && args[1].__inboxsdk_logged) {
          args[1] = args[1].__inboxsdk_logged;
        }
        return original.apply(this, args);
      };
    });

    replaceFunction(window, 'MutationObserver', function(Original) {
      Original = Original || window.WebKitMutationObserver;

      function WrappedMutationObserver() {
        var args = _.toArray(arguments);
        if (typeof args[0] == 'function') {
          args[0] = makeLoggedFunction(args[0], "MutationObserver callback");
        }
        if (Original.bind && Original.bind.apply) {
          // call constructor with variable number of arguments
          return new (Original.bind.apply(Original, [null].concat(args)))();
        } else {
          // Safari's MutationObserver lacks a bind method, but its constructor
          // doesn't support extra arguments anyway, so don't bother logging an
          // error here.
          return new Original(args[0]);
        }
      }

      // Just in case someone wants to monkey-patch the prototype.
      WrappedMutationObserver.prototype = Original.prototype;

      return WrappedMutationObserver;
    });
  } else {
    // Even if we're set not to log errors, we should still avoid letting RSVP
    // swallow errors entirely.
    RSVP.on('error', function(err) {
      setTimeout(function() {
        throw err;
      }, 0);
    });
  }
};

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
    stuffToLog = stuffToLog.concat(["\n\nError logged from:", nowStack]);
    if (details) {
      stuffToLog = stuffToLog.concat(["\n\nError details:", details]);
    }
    stuffToLog = stuffToLog.concat(["\n\nExtension App Ids:"], _appIds);
    stuffToLog = stuffToLog.concat(["\nSession Id:", _sessionId]);
    stuffToLog = stuffToLog.concat(["\nExtension Id:", getExtensionId()]);
    stuffToLog = stuffToLog.concat(["\nInboxSDK Loader Version:", _LOADER_VERSION]);
    stuffToLog = stuffToLog.concat(["\nInboxSDK Implementation Version:", _IMPL_VERSION]);

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
  return sha256('inboxsdk:'+str);
}

tracker.setUserEmailAddress = function(userEmailAddress) {
  _userEmailHash = hash(userEmailAddress);
};

function track(type, eventName, details) {
  console.log('track', type, eventName, details);
  var event = {
    type: type,
    event: eventName,
    properties: _.extend({}, details, {
      type: type,
      eventName: eventName,
      timestamp: new Date().getTime()*1000,
      screenWidth: screen.width,
      screenHeight: screen.height,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      origin: document.location.origin,
      sessionId: _sessionId,
      emailHash: _userEmailHash
    })
  };

  if (type != 'gmail') {
    _.extend(event.properties, {
      extensionId: getExtensionId(),
      appIds: _appIds
    });
  }

  _trackedEventsQueue.add(event);

  // Signal to the tracker master that a new event is ready to be sent.
  document.head.setAttribute('data-inboxsdk-last-event', Date.now());
}

if (_isTrackerMaster) {
  makeMutationObserverStream(document.head, {
    attributes: true, attributeFilter: 'data-inboxsdk-last-event'
  }).map(null).throttle(30*1000).onValue(function() {
    var events = _trackedEventsQueue.removeAll();

    ajax({
      url: 'https://events.inboxsdk.com/api/v2/track',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      data: JSON.stringify({
        data: events,
        clientRequestTimestamp: new Date().getTime()*1000
      })
    });
  });
}

// For tracking app events that are possibly triggered by the user. Extensions
// can opt out of this with a flag passed to InboxSDK.load().
tracker.trackAppActive = function(eventName, detail) {
  if (!_useEventTracking) {
    return;
  }
  track('appActive', eventName, detail);
};

// Track events unrelated to user activity about how the app uses the SDK.
// Examples include the app being initialized, and calls to any of the
// register___ViewHandler functions.
tracker.trackAppPassive = function(eventName, detail) {
  track('appPassive', eventName, detail);
};

// Track Gmail events.
tracker.trackGmail = function(eventName, detail) {
  // Only the first InboxSDK extension reports Gmail events.
  if (!_isTrackerMaster || !_useEventTracking) {
    return;
  }
  track('gmail', eventName, detail);
};
