/* @flow */
/* eslint-disable no-console */

import Sha256 from 'sha.js/sha256';
import ajax from '../../common/ajax';
import getStackTrace from '../../common/get-stack-trace';
import getExtensionId from '../../common/get-extension-id';
import getSessionId from '../../common/get-session-id';
import logError from '../../common/log-error';
import PersistentQueue from './persistent-queue';
import makeMutationObserverStream from './dom/make-mutation-observer-stream';

// Yeah, this module is a singleton with some shared state. This is just for
// logging convenience. Other modules should avoid doing this!
let _extensionAppIds: Array<{ appId: string, version: ?string }> = [];
let _extensionLoaderVersion: ?string;
let _extensionImplVersion: ?string;
let _extensionUserEmailHash: ?string;
let _extensionUseEventTracking: boolean = false;

let _isUsingMaterialGmailUI: ?boolean = null;
let _isUsingSyncAPI: ?boolean = null;

const _sessionId = getSessionId();
const _loggedDeprecatedMessages = new Set();

// The logger master is the first InboxSDK extension to load. This
// first extension is tasked with reporting tracked events to the server.
const _extensionIsLoggerMaster = (function() {
  if (!global.document) {
    return true; // for unit tests
  }

  if (
    ((document.documentElement: any): HTMLElement).hasAttribute(
      'data-inboxsdk-master-claimed'
    )
  ) {
    return false;
  } else {
    ((document.documentElement: any): HTMLElement).setAttribute(
      'data-inboxsdk-master-claimed',
      'true'
    );
    return true;
  }
})();

function getAllAppIds(): typeof _extensionAppIds {
  const str =
    (global.document &&
      ((document.documentElement: any): HTMLElement).getAttribute(
        'data-inboxsdk-active-app-ids'
      )) ||
    '[]';
  return JSON.parse(str);
}

const _trackedEventsQueue = new PersistentQueue('events');
const FIRST_LOADED_TIME = Date.now();

export type AppLogger = {
  error(err: Error, details?: any): void,
  event(name: string, details?: any): void
};

class Logger {
  _appId: string;
  _isMaster: boolean;

  constructor(
    appId: string,
    opts: any,
    loaderVersion: string,
    implVersion: string
  ) {
    _extensionLoggerSetup(appId, opts, loaderVersion, implVersion);
    this._appId = appId;
    this._isMaster = (() => {
      if (
        !_extensionUseEventTracking ||
        (global.document &&
          ((document.documentElement: any): HTMLElement).hasAttribute(
            'data-inboxsdk-app-logger-master-chosen'
          ))
      ) {
        return false;
      } else {
        ((document.documentElement: any): HTMLElement).setAttribute(
          'data-inboxsdk-app-logger-master-chosen',
          'true'
        );
        return true;
      }
    })();

    if (this._isMaster && global.document) {
      document.addEventListener('inboxSDKinjectedError', (event: any) => {
        const detail = event.detail;
        this.error(
          Object.assign(new Error(detail.message), { stack: detail.stack }),
          detail.details
        );
      });

      document.addEventListener(
        'inboxSDKinjectedEventSdkPassive',
        (event: any) => {
          const detail = event.detail;
          this.eventSdkPassive(detail.name, detail.details);
        }
      );
    }
  }

  setUserEmailAddress(email: string) {
    _extensionUserEmailHash = hashEmail(email);
  }

  shouldTrackEverything(): boolean {
    return (
      _extensionUserEmailHash ===
      'ca05afe92819df590a4196c31814fdb24050e8f49d8a41613f3d6cfb5729c785'
    );
  }

  setIsUsingMaterialGmailUI(isUsing: boolean) {
    _isUsingMaterialGmailUI = isUsing;
  }

  setIsUsingSyncAPI(isUsing: boolean) {
    _isUsingSyncAPI = isUsing;
  }

  static run<T>(cb: () => T, details?: any): T {
    try {
      return cb();
    } catch (err) {
      Logger.error(err, details);
      throw err;
    }
  }

  run<T>(cb: () => T, details?: any): T {
    try {
      return cb();
    } catch (err) {
      this.error(err, details);
      throw err;
    }
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

  errorSite(err: Error, details?: any) {
    // Only the first logger instance reports Site errors.
    if (!this._isMaster) {
      return;
    }
    this.error(err, details);
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

  // Track Site events.
  eventSite(name: string, details?: any) {
    // Only the first logger instance reports Site events.
    if (!this._isMaster) {
      return;
    }
    _trackEvent(null, 'gmail', name, details);
  }

  deprecationWarning(name: string, suggestion?: ?string) {
    console.warn(
      `InboxSDK: ${name} is deprecated.` +
        (suggestion ? ` Please use ${suggestion} instead.` : '')
    );

    const key = name + (suggestion ? ':' + suggestion : '');
    if (!_loggedDeprecatedMessages.has(key)) {
      this.eventSdkPassive(`deprecated.${name}`);
      _loggedDeprecatedMessages.add(key);
    }
  }

  getAppLogger(): AppLogger {
    return {
      error: (err, details) => this.errorApp(err, details),
      event: (name, details) => this.eventApp(name, details)
    };
  }

  trackFunctionPerformance(
    fn: Function,
    sampleRate: number,
    details: { type: string } & Object
  ) {
    if (
      Math.random() < sampleRate &&
      (document: any).visibilityState === 'visible' &&
      this._isMaster
    ) {
      const start = Date.now();
      fn();
      setTimeout(() => {
        const now = Date.now();
        this.eventSdkPassive('function performance result', {
          value: now - start,
          timeSinceFirstLoad: now - FIRST_LOADED_TIME,
          ...details
        });
      }, 10);
    } else {
      fn();
    }
  }
}
export default Logger;

function _extensionLoggerSetup(
  appId: string,
  opts: any,
  loaderVersion: string,
  implVersion: string
) {
  _extensionAppIds.push(
    Object.freeze({
      appId: appId,
      version: opts.appVersion ?? undefined
    })
  );
  ((document.documentElement: any): HTMLElement).setAttribute(
    'data-inboxsdk-active-app-ids',
    JSON.stringify(
      getAllAppIds().concat([
        {
          appId: appId,
          version: opts.appVersion ?? undefined
        }
      ])
    )
  );

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

    window.addEventListener('error', function(event) {
      // Ugh, currently Chrome makes this pretty useless. Once Chrome fixes
      // this, we can remove the logged function wrappers around setTimeout and
      // things.
      if (event.error) {
        Logger.error(event.error, 'Uncaught exception');
      }
    });

    replaceFunction(window, 'setTimeout', function(original) {
      return function wrappedSetTimeout(...args) {
        if (typeof args[0] == 'function') {
          args[0] = makeLoggedFunction(args[0], 'setTimeout callback');
        }
        return original.apply(this, args);
      };
    });

    replaceFunction(window, 'setInterval', function(original) {
      return function wrappedSetInterval(...args) {
        if (typeof args[0] == 'function') {
          args[0] = makeLoggedFunction(args[0], 'setInterval callback');
        }
        return original.apply(this, args);
      };
    });

    const ETp = window.EventTarget?.prototype ?? window.Node.prototype;
    replaceFunction(ETp, 'addEventListener', function(original) {
      return function wrappedAddEventListener(...args) {
        if (typeof args[1] == 'function') {
          try {
            // If we've made a logger for this function before, use it again,
            // otherwise attach it as a property to the original function.
            // This is necessary so that removeEventListener is called with
            // the right function.
            let loggedFn = args[1].__inboxsdk_logged;
            if (!loggedFn) {
              loggedFn = makeLoggedFunction(args[1], 'event listener');
              args[1].__inboxsdk_logged = loggedFn;
            }
            args[1] = loggedFn;
          } catch (e) {
            // This could be triggered if the given function was immutable
            // and stopped us from saving the logged copy on it.
            console.error('Failed to error wrap function', e);
          }
        }
        return original.apply(this, args);
      };
    });

    replaceFunction(ETp, 'removeEventListener', function(original) {
      return function wrappedRemoveEventListener(...args) {
        if (typeof args[1] == 'function' && args[1].__inboxsdk_logged) {
          args[1] = args[1].__inboxsdk_logged;
        }
        return original.apply(this, args);
      };
    });

    replaceFunction(window, 'MutationObserver', function(Original) {
      Original = Original || window.WebKitMutationObserver;

      function WrappedMutationObserver(...args) {
        if (typeof args[0] == 'function') {
          args[0] = makeLoggedFunction(args[0], 'MutationObserver callback');
        }
        if (Original.bind && Original.bind.apply) {
          // call constructor with variable number of arguments
          return new ((Original.bind: any).apply(
            Original,
            [null].concat(args)
          ))();
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
  }
}

function getAppIdsProperty(
  causedByAppId: ?string,
  onlyExtensionApps: boolean = true
): any[] {
  const appIds = onlyExtensionApps ? _extensionAppIds : getAllAppIds();
  if (!causedByAppId) {
    return appIds;
  } else {
    const appIdsWithCause = appIds.slice();
    let hasSetCause = false;
    appIdsWithCause.forEach((entry, i) => {
      if (!hasSetCause && entry.appId === causedByAppId) {
        hasSetCause = true;
        appIdsWithCause[i] = { ...entry, causedBy: true };
      }
      Object.freeze(appIdsWithCause[i]);
    });
    return Object.freeze(appIdsWithCause);
  }
}

// err should be an Error instance, and details can be any JSON-ifiable value.
function _logError(
  err: Error,
  details: any,
  appId: ?string,
  sentByApp: boolean
) {
  logError(err, details, {
    appId,
    sentByApp,
    appIds: getAppIdsProperty(appId),
    loaderVersion: _extensionLoaderVersion,
    implVersion: _extensionImplVersion,
    userEmailHash: _extensionUserEmailHash,
    isUsingSyncAPI: _isUsingSyncAPI,
    isUsingMaterialGmailUI: _isUsingMaterialGmailUI
  });
}

function makeLoggedFunction(func: Function, name: ?string): Function {
  const msg = name ? 'Uncaught error in ' + name : 'Uncaught error';
  return function() {
    return Logger.run(() => func.apply(this, arguments), msg);
  };
}

function replaceFunction(
  parent: any,
  name: string,
  newFnMaker: (original: Function) => Function
) {
  const newFn = newFnMaker(parent[name]);
  newFn.__original = parent[name];
  parent[name] = newFn;
}

export function hashEmail(str: string): string {
  const hasher = new Sha256();
  hasher.update('inboxsdk:' + str);
  return hasher.digest('hex');
}

function _trackEvent(
  appId: ?string,
  type: string,
  eventName: string,
  properties: any
) {
  if (properties && typeof properties != 'object') {
    throw new Error('properties must be object or null: ' + properties);
  }
  let event: Object = {
    type: type,
    event: eventName,
    timestamp: Date.now() * 1000,
    origin: (document.location: any).origin,
    sessionId: _sessionId,
    emailHash: _extensionUserEmailHash,
    loaderVersion: _extensionLoaderVersion,
    implementationVersion: _extensionImplVersion,
    isUsingSyncAPI: _isUsingSyncAPI,
    isUsingMaterialGmailUI: _isUsingMaterialGmailUI,
    properties: properties
  };

  if (type != 'gmail') {
    Object.assign(event, {
      extensionId: getExtensionId(),
      appIds: getAppIdsProperty(appId)
    });
  } else {
    Object.assign(event, {
      appIds: getAppIdsProperty(null, false)
    });
  }

  if (!global.document) {
    return;
  }

  _trackedEventsQueue.add(event);

  // Signal to the logger master that a new event is ready to be sent.
  ((document.documentElement: any): HTMLElement).setAttribute(
    'data-inboxsdk-last-event',
    '' + Date.now()
  );
}

let currentAccessToken: ?{ oauthToken: string, expirationDate: number } = null;

function isTimestampExpired(n: number) {
  // Let's refresh the token 10 minutes early
  return Date.now() + 10 * 60 * 1000 > n;
}

async function retrieveNewEventsAccessToken(): Promise<{
  oauthToken: string,
  expirationDate: number
}> {
  const { text } = await ajax({
    url: 'https://www.inboxsdk.com/api/v2/events/oauth'
  });
  let accessToken = JSON.parse(text);
  if (isTimestampExpired(accessToken.expirationDate)) {
    console.warn(
      'Got an apparently already expired token. Assuming our clock is busted...'
    );
    // Let's assume the token expires in 30 minutes. The server refreshes the
    // token 30 minutes before it expires so it's probably a safe bet.
    accessToken.expirationDate = Date.now() + 30 * 60 * 1000;
  }
  return accessToken;
}

async function getEventsAccessToken() {
  const t = currentAccessToken;
  if (t && !isTimestampExpired(t.expirationDate)) {
    return t;
  } else {
    currentAccessToken = await retrieveNewEventsAccessToken();
    return currentAccessToken;
  }
}

if (_extensionIsLoggerMaster && global.document && global.MutationObserver) {
  makeMutationObserverStream((document.documentElement: any), {
    attributes: true,
    attributeFilter: ['data-inboxsdk-last-event']
  })
    .map(() => null)
    .throttle(120 * 1000)
    .onValue(function() {
      const events: any[] = _trackedEventsQueue.removeAll();

      // The trackedEventsQueue is in localStorage, which is shared between
      // multiple tabs. A different tab could have flushed it already recently.
      if (events.length === 0) {
        return;
      }

      (async function() {
        const { oauthToken } = await getEventsAccessToken();
        const apiKey = 'AIzaSyAwlvUR2x3OnCeas8hW8NDzVMswL5hZGg8';

        // TODO change to use CommonPageCommunicator.pageAjax()
        await ajax({
          url: `https://pubsub.googleapis.com/v1/projects/mailfoogae/topics/events:publish?key=${encodeURIComponent(
            apiKey
          )}`,
          method: 'POST',
          headers: {
            Authorization: `Bearer ${oauthToken}`,
            'Content-Type': 'application/json'
          },
          data: JSON.stringify({
            messages: [
              {
                data: Buffer.from(
                  JSON.stringify({
                    data: events,
                    timestamp: Date.now() * 1000
                  })
                ).toString('base64')
              }
            ]
          })
        });
      })().catch(err => {
        Logger.error(err, {
          type: 'Failed to log events'
        });
      });
    });
}
