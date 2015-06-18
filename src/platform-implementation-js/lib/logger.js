/* @flow */
// jshint ignore:start

import _ from 'lodash';
import ajax from '../../common/ajax';
import RSVP from 'rsvp';
import getStackTrace from '../../common/get-stack-trace';
import getExtensionId from '../../common/get-extension-id';
import PersistentQueue from './persistent-queue';
import makeMutationObserverStream from './dom/make-mutation-observer-stream';

// Yeah, this module is a singleton with some shared state. This is just for
// logging convenience. Other modules should avoid doing this!
var _extensionAppIds = [];
var _extensionSeenErrors: WeakSet<Error> = new WeakSet();
var _extensionLoaderVersion;
var _extensionImplVersion;
var _extensionUserEmailHash;
var _extensionUseEventTracking;

// The logger master is the first InboxSDK extension to load. This
// first extension is tasked with reporting tracked events to the server.
var [_extensionIsLoggerMaster, _sessionId] = (function() {
  if (global.document && document.head.hasAttribute('data-inboxsdk-session-id')) {
    return [false, document.head.getAttribute('data-inboxsdk-session-id')];
  } else {
    var _sessionId = Date.now()+'-'+Math.random();
    if (global.document) {
      document.head.setAttribute('data-inboxsdk-session-id', _sessionId);
    }
    return [true, _sessionId];
  }
})();

function getAllAppIds(): string[] {
  if (global.document && document.head.hasAttribute('data-inboxsdk-active-app-ids')) {
    return JSON.parse(document.head.getAttribute('data-inboxsdk-active-app-ids'));
  } else {
    return [];
  }
}

var _trackedEventsQueue = new PersistentQueue('events');

export type AppLogger = {
  error(err: Error, details?: any): void;
  event(name: string, details?: any): void;
};

class Logger {
  _appId: string;
  _isMaster: boolean;

  constructor(appId: string, opts: any, loaderVersion: string, implVersion: string) {
    _extensionLoggerSetup(appId, opts, loaderVersion, implVersion);
    this._appId = appId;
    this._isMaster = (function() {
      if (
        !_extensionUseEventTracking || (
          global.document &&
          document.head.hasAttribute('data-inboxsdk-app-logger-master-chosen')
      )) {
        return false;
      } else {
        document.head.setAttribute('data-inboxsdk-app-logger-master-chosen', 'true');
        return true;
      }
    })();
  }

  setUserEmailAddress(email: string) {
    _extensionUserEmailHash = hash(email);
  }

  static error(err: Error, details?: any) {
    _logError(err, details, null, false);
  }

  error(err: Error, details?: any) {
    _logError(err, details, this._appId, false);
  }

  errorApp(err: Error, details?: any) {
    _logError(err, details, this._appId, true);
  }

  // Should only be used by the InboxSDK users for their own app events.
  eventApp(name: string, details?: any) {
    _trackEvent(this._appId, 'app', name, details);
  }

  // For tracking app events that are possibly triggered by the user. Extensions
  // can opt out of this with a flag passed to InboxSDK.load().
  eventSdkActive(name: string, details?: any) {
    if (!_extensionUseEventTracking) {
      return;
    }
    _trackEvent(this._appId, 'sdkActive', name, details);
  }

  // Track events unrelated to user activity about how the app uses the SDK.
  // Examples include the app being initialized, and calls to any of the
  // register___ViewHandler functions.
  eventSdkPassive(name: string, details?: any) {
    _trackEvent(this._appId, 'sdkPassive', name, details);
  }

  // Track Gmail events.
  eventGmail(name: string, details?: any) {
    // Only the first logger instance reports Gmail events.
    if (!this._isMaster) {
      return;
    }
    _trackEvent(null, 'gmail', name, details);
  }

  getAppLogger(): AppLogger {
    return {
      error: (err, details) => this.errorApp(err, details),
      event: (name, details) => this.eventApp(name, details)
    };
  }
}
export default Logger;

function _extensionLoggerSetup(appId: string, opts: any, loaderVersion: string, implVersion: string) {
  _extensionAppIds.push(Object.freeze({
    appId: appId,
    version: opts.appVersion || undefined
  }));
  document.head.setAttribute(
    'data-inboxsdk-active-app-ids', JSON.stringify(getAllAppIds().concat([
      {
        appId: appId,
        version: opts.appVersion || undefined
      }
    ])));

  if (_extensionLoaderVersion) {
    return;
  }

  _extensionLoaderVersion = loaderVersion;
  _extensionImplVersion = implVersion;
  _extensionUseEventTracking = opts.eventTracking;

  if (opts.globalErrorLogging) {
    if ((Error: any).stackTraceLimit < 40) {
      (Error: any).stackTraceLimit = 40;
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
      setTimeout(() => {
        throw err;
      }, 0);
    });
  }
}

function haveWeSeenThisErrorAlready(error: Error): boolean {
  if (error && typeof error == 'object') {
    return _extensionSeenErrors.has(error);
  }
  return false;
}

function markErrorAsSeen(error: Error) {
  if (error && typeof error == 'object') {
    _extensionSeenErrors.add(error);
  }
}

function tooManyErrors(err2: Error, originalArgs: any) {
  console.error("ERROR REPORTING ERROR", err2);
  console.error("ORIGINAL ERROR", originalArgs);
}

function getAppIdsProperty(causedByAppId: ?string, onlyExtensionApps: boolean=true): any[] {
  var appIds = onlyExtensionApps ? _extensionAppIds : getAllAppIds();
  if (!causedByAppId) {
    return appIds;
  } else {
    var appIdsWithCause = _.cloneDeep(appIds);
    appIdsWithCause.forEach(function(entry) {
      if (entry.appId === causedByAppId) {
        entry.causedBy = true;
      }
      Object.freeze(entry);
    });
    return Object.freeze(appIdsWithCause);
  }
}

// err should be an Error instance, and details can be any JSON-ifiable value.
function _logError(err: Error, details: any, appId: ?string, sentByApp: boolean) {
  if (!global.document) {
    // In tests, just throw the error.
    throw err;
  }

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
      console.warn('First parameter to Logger.error was not an error object:', err);
      err = new Error("Logger.error called with non-error: "+err);
      markErrorAsSeen(err);
    }
    sentByApp = !!sentByApp;

    var appIds = getAppIdsProperty(appId);

    // Might not have been passed a useful error object with a stack, so get
    // our own current stack just in case.
    var nowStack = getStackTrace();

    // Show the error immediately, don't wait on implementation load for that.
    var stuffToLog: any[] = ["Error logged:", err];
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

    var report = {
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
      origin: (document.location: any).origin,
      timestamp: Date.now()*1000
    };

    _sendError(report);
  } catch(err2) {
    tooManyErrors(err2, args);
  }
}

var _sendError = _.throttle(function(report: any) {
  var args = arguments;

  try {
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
}, 1000);

function makeLoggedFunction(func: Function, name: ?string): Function {
  var msg = name ? "Uncaught error in "+name : "Uncaught error";
  return function() {
    var functionArgs = arguments;

    try {
      return func.apply(this, arguments);
    } catch (err) {
      Logger.error(err, msg);
      throw err;
    }
  };
}

function replaceFunction(parent: any, name: string, newFnMaker: (original: Function) => Function) {
  var newFn = newFnMaker(parent[name]);
  newFn.__original = parent[name];
  parent[name] = newFn;
}

function hash(str: string): string {
  var sha256 = require('sha256');
  return sha256('inboxsdk:'+str);
}

function _trackEvent(appId: ?string, type: string, eventName: string, properties: any) {
  if (properties && typeof properties != 'object') {
    throw new Error("properties must be object or null: "+properties);
  }
  var event = {
    type: type,
    event: eventName,
    timestamp: Date.now()*1000,
    origin: (document.location: any).origin,
    sessionId: _sessionId,
    emailHash: _extensionUserEmailHash,
    loaderVersion: _extensionLoaderVersion,
    implementationVersion: _extensionImplVersion,
    properties: properties
  };

  if (type != 'gmail') {
    _.extend(event, {
      extensionId: getExtensionId(),
      appIds: getAppIdsProperty(appId)
    });
  } else {
    _.extend(event, {
      appIds: getAppIdsProperty(null, false)
    });
  }

  if (!global.document) {
    return;
  }

  _trackedEventsQueue.add(event);

  // Signal to the logger master that a new event is ready to be sent.
  document.head.setAttribute('data-inboxsdk-last-event', ''+Date.now());
}

if (_extensionIsLoggerMaster && global.document) {
  makeMutationObserverStream(document.head, {
    attributes: true, attributeFilter: ['data-inboxsdk-last-event']
  }).map(null).throttle(120*1000).onValue(function() {
    var events: any[] = _trackedEventsQueue.removeAll();

    // The trackedEventsQueue is in localStorage, which is shared between
    // multiple tabs. A different tab could have flushed it already recently.
    if (events.length === 0) {
      return;
    }

    ajax({
      url: 'https://www.inboxsdk.com/api/v2/events',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      data: JSON.stringify({
        data: events,
        timestamp: Date.now()*1000
      })
    }).catch(function(err) {
      //suppress error when logging event
    });
  });

  document.addEventListener('inboxSDKinjectedError', function(event) {
    var detail = event.detail;
    Logger.error(
      _.assign(new Error(detail.message), {stack: detail.stack}),
      detail.details
    );
  });
}
