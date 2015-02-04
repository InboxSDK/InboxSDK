const _ = require('lodash');
const ajax = require('../../common/ajax');
const RSVP = require('rsvp');
const getStackTrace = require('../../common/get-stack-trace');
const getExtensionId = require('../../common/get-extension-id');
const PersistentQueue = require('./persistent-queue');
const makeMutationObserverStream = require('./dom/make-mutation-observer-stream');

// Yeah, this module is a singleton with some shared state. This is just for
// logging convenience. Other modules should avoid doing this!
const _extensionAppIds = [];
const _extensionSeenErrors = new WeakSet();
var _extensionLoaderVersion;
var _extensionImplVersion;
var _extensionUserEmailHash;
var _extensionUseEventTracking;

// The logger master is the first InboxSDK extension to load. This
// first extension is tasked with reporting tracked events to the server.
const [_extensionIsLoggerMaster, _sessionId] = (function() {
  if (global.document && document.head.hasAttribute('data-inboxsdk-session-id')) {
    return [false, document.head.getAttribute('data-inboxsdk-session-id')];
  } else {
    const _sessionId = Date.now()+'-'+Math.random();
    if (global.document) {
      document.head.setAttribute('data-inboxsdk-session-id', _sessionId);
    }
    return [true, _sessionId];
  }
})();

const _trackedEventsQueue = new PersistentQueue('events');

class Logger {
  constructor(appId, opts, loaderVersion, implVersion) {
    this._appId = appId;
    this._isMaster = (function() {
      if (
        !_extensionUseEventTracking || (
          global.document &&
          document.head.hasAttribute('data-inboxsdk-app-logger-master-chosen')
      )) {
        return false;
      } else {
        document.head.setAttribute('data-inboxsdk-app-logger-master-chosen', true);
        return true;
      }
    })();
    _extensionLoggerSetup(appId, opts, loaderVersion, implVersion);
  }

  setUserEmailAddress(email) {
    _extensionUserEmailHash = hash(email);
  }

  static error(err, details) {
    _sendError(err, details, null, false);
  }

  error(err, details) {
    _sendError(err, details, this._appId, false);
  }

  errorApp(err, details) {
    _sendError(err, details, this._appId, true);
  }

  // Should only be used by the InboxSDK users for their own app events.
  eventApp(name, details) {
    _trackEvent('app', name, details);
  }

  // For tracking app events that are possibly triggered by the user. Extensions
  // can opt out of this with a flag passed to InboxSDK.load().
  eventSdkActive(name, details) {
    if (!_extensionUseEventTracking) {
      return;
    }
    _trackEvent('sdkActive', name, details);
  }

  // Track events unrelated to user activity about how the app uses the SDK.
  // Examples include the app being initialized, and calls to any of the
  // register___ViewHandler functions.
  eventSdkPassive(name, details) {
    _trackEvent('sdkPassive', name, details);
  }

  // Track Gmail events.
  eventGmail(name, details) {
    // Only the first logger instance reports Gmail events.
    if (!this._isMaster) {
      return;
    }
    _trackEvent('gmail', name, details);
  }

  getAppLogger() {
    return {
      error: (err, details) => this.errorApp(err, details),
      event: (name, details) => this.eventApp(name, details)
    };
  }
}

module.exports = Logger;

function _extensionLoggerSetup(appId, opts, loaderVersion, implVersion) {
  _extensionAppIds.push(Object.freeze({
    appId: appId,
    version: opts.appVersion || undefined
  }));

  if (_extensionLoaderVersion) {
    return;
  }

  _extensionLoaderVersion = loaderVersion;
  _extensionImplVersion = implVersion;
  _extensionUseEventTracking = opts.eventTracking;

  if (opts.globalErrorLogging) {
    if (Error.stackTraceLimit < 30) {
      Error.stackTraceLimit = 30;
    }

    RSVP.on('error', function(err) {
      Logger.error(err, "Possibly uncaught promise rejection");
    });

    window.addEventListener('error', function(event) {
      // Ugh, currently Chrome makes this pretty useless. Once Chrome fixes
      // this, we can remove the logged function wrappers around setTimeout and
      // things.
      if (event.error) {
        Logger.error(event.error, "Uncaught exception");
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

    const ETp = window.EventTarget ? window.EventTarget.prototype : window.Node.prototype;
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
      setTimeout(() => {
        throw err;
      }, 0);
    });
  }
}

function haveWeSeenThisErrorAlready(error) {
  if (error && typeof error == 'object') {
    return _extensionSeenErrors.has(error);
  }
  return false;
}

function markErrorAsSeen(error) {
  if (error && typeof error == 'object') {
    _extensionSeenErrors.add(error);
  }
}

function tooManyErrors(err2, originalArgs) {
  console.error("ERROR REPORTING ERROR", err2);
  console.error("ORIGINAL ERROR", originalArgs);
}

// err should be an Error instance, and details can be any JSON-ifiable value.
function _sendError(err, details, appId, sentByApp) {
  if (!global.document) {
    // In tests, just throw the error.
    throw err;
  }

  const args = arguments;

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
      console.warn('First parameter to Logger.error was not an error object:', err);
      err = new Error("Logger.error called with non-error: "+err);
      markErrorAsSeen(err);
    }
    sentByApp = !!sentByApp;

    const appIds = _.cloneDeep(_extensionAppIds);
    appIds.some(function(entry) {
      if (entry.appId === appId) {
        entry.causedBy = true;
        return true;
      }
    });

    // Might not have been passed a useful error object with a stack, so get
    // our own current stack just in case.
    const nowStack = getStackTrace();

    // Show the error immediately, don't wait on implementation load for that.
    let stuffToLog = ["Error logged:", err];
    if (err && err.stack) {
      stuffToLog = stuffToLog.concat(["\n\nOriginal error stack:\n"+err.stack]);
    }
    stuffToLog = stuffToLog.concat(["\n\nError logged from:\n"+nowStack]);
    if (details) {
      stuffToLog = stuffToLog.concat(["\n\nError details:", details]);
    }
    stuffToLog = stuffToLog.concat(["\n\nExtension App Ids:", JSON.stringify(appIds, null, 2)]);
    stuffToLog = stuffToLog.concat(["\nSent by App:", sentByApp]);
    stuffToLog = stuffToLog.concat(["\nSession Id:", _sessionId]);
    stuffToLog = stuffToLog.concat(["\nExtension Id:", getExtensionId()]);
    stuffToLog = stuffToLog.concat(["\nInboxSDK Loader Version:", _extensionLoaderVersion]);
    stuffToLog = stuffToLog.concat(["\nInboxSDK Implementation Version:", _extensionImplVersion]);

    console.error(...stuffToLog);

    const report = {
      message: err && err.message || err,
      stack: err && err.stack,
      loggedFrom: nowStack,
      details: details,
      appIds: appIds,
      sentByApp: sentByApp,
      sessionId: _sessionId,
      emailHash: _extensionUserEmailHash,
      extensionId: getExtensionId(),
      loaderVersion: _extensionLoaderVersion,
      implementationVersion: _extensionImplVersion,
      timestamp: new Date().getTime()*1000
    };

    ajax({
      url: 'https://www.inboxsdk.com/api/v2/errors',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      data: JSON.stringify(report)
    }).catch(function(err2) {
      tooManyErrors(err2, args);
    });
  } catch(err2) {
    tooManyErrors(err2, args);
  }
}

function makeLoggedFunction(func, name) {
  const msg = name ? "Uncaught error in "+name : "Uncaught error";
  return function() {
    try {
      return func.apply(this, arguments);
    } catch (err) {
      Logger.error(err, msg);
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
  const sha256 = require('sha256');
  return sha256('inboxsdk:'+str);
}

function _trackEvent(type, eventName, properties) {
  if (typeof type != 'string') {
    throw new Error("type must be string: "+type);
  }
  if (typeof eventName != 'string') {
    throw new Error("eventName must be string: "+eventName);
  }
  if (properties && typeof properties != 'object') {
    throw new Error("properties must be object or null: "+properties);
  }
  let event = {
    type: type,
    event: eventName,
    timestamp: new Date().getTime()*1000,
    screenWidth: window.screen && window.screen.width,
    screenHeight: window.screen && window.screen.height,
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    origin: document.location.origin,
    sessionId: _sessionId,
    emailHash: _extensionUserEmailHash,
    properties: properties
  };

  if (type != 'gmail') {
    _.extend(event, {
      extensionId: getExtensionId(),
      appIds: _extensionAppIds
    });
  }

  if (!global.document) {
    return;
  }

  _trackedEventsQueue.add(event);

  // Signal to the logger master that a new event is ready to be sent.
  document.head.setAttribute('data-inboxsdk-last-event', Date.now());
}

if (_extensionIsLoggerMaster && global.document) {
  makeMutationObserverStream(document.head, {
    attributes: true, attributeFilter: ['data-inboxsdk-last-event']
  }).map(null).throttle(30*1000).onValue(function() {
    const events = _trackedEventsQueue.removeAll();

    ajax({
      url: 'https://www.inboxsdk.com/api/v2/events',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      data: JSON.stringify({
        data: events,
        timestamp: new Date().getTime()*1000
      })
    });
  });
}
