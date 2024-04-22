import Sha256 from 'sha.js/sha256';
import ajax from '../../common/ajax';
import { getExtensionId } from '../../common/extension-apis';
import getSessionId from '../../common/get-session-id';
import logError from '../../common/log-error';
import PersistentQueue from './persistent-queue';
import makeMutationObserverStream from './dom/make-mutation-observer-stream';
import { getXMLHttpRequest } from 'ext-corb-workaround';
import isStreakAppId from './isStreakAppId';
import type { PiOpts } from '../platform-implementation';

// Yeah, this module is a singleton with some shared state. This is just for
// logging convenience. Other modules should avoid doing this!
const _extensionAppIds: Array<{
  appId: string;
  version: string | null | undefined;
}> = [];
let _extensionLoaderVersion: string | undefined;
let _extensionImplVersion: string | undefined;
let _extensionUserEmailHash: string | undefined;
let _extensionUseEventTracking = false;

const _sessionId = getSessionId();
const _loggedDeprecatedMessages = new Set();

// The logger master is the first InboxSDK extension to load. This
// first extension is tasked with reporting tracked events to the server.
const _extensionIsLoggerMaster = (function () {
  if (typeof document === 'undefined') {
    return true; // for unit tests
  }

  if (document.documentElement.hasAttribute('data-inboxsdk-master-claimed')) {
    return false;
  } else {
    document.documentElement.setAttribute(
      'data-inboxsdk-master-claimed',
      'true',
    );
    return true;
  }
})();

function getAllAppIds(): typeof _extensionAppIds {
  const str =
    (typeof document !== 'undefined' &&
      document.documentElement.getAttribute('data-inboxsdk-active-app-ids')) ||
    '[]';
  return JSON.parse(str);
}

const _trackedEventsQueue = new PersistentQueue('events');
const FIRST_LOADED_TIME = Date.now();

export interface AppLogger {
  error(err: Error | unknown, details?: any): void;
  event(name: string, details?: any): void;
}

export default class Logger {
  #appId: string;
  #isMaster: boolean;

  constructor(
    appId: string,
    opts: PiOpts,
    loaderVersion: string,
    implVersion: string,
  ) {
    _extensionLoggerSetup(appId, opts, loaderVersion, implVersion);
    this.#appId = appId;
    this.#isMaster = (() => {
      if (
        !_extensionUseEventTracking ||
        (typeof document !== 'undefined' &&
          document.documentElement.hasAttribute(
            'data-inboxsdk-app-logger-master-chosen',
          ))
      ) {
        return false;
      } else {
        document.documentElement.setAttribute(
          'data-inboxsdk-app-logger-master-chosen',
          'true',
        );
        return true;
      }
    })();

    if (this.#isMaster && typeof document !== 'undefined') {
      document.addEventListener('inboxSDKinjectedError', (event: unknown) => {
        if (!(event instanceof CustomEvent && event?.detail)) {
          this.error(new Error('Invalid inboxSDKinjectedError event'), event);
          return;
        }

        const detail = event.detail;
        this.error(
          Object.assign(new Error(detail.message), { stack: detail.stack }),
          detail.details,
        );
      });

      document.addEventListener(
        'inboxSDKinjectedEventSdkPassive',
        (event: any) => {
          const detail = event.detail;
          this.eventSdkPassive(detail.name, detail.details, detail.sensitive);
        },
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

  static error(err: Error | unknown, details?: any) {
    _logError(err, details, undefined, false);
  }

  error(err: Error | unknown, details?: any) {
    _logError(err, details, this.#appId, false);
  }

  errorApp(err: Error | unknown, details?: any) {
    _logError(err, details, this.#appId, true);
  }

  /** Only the first logger instance reports Site errors. */
  errorSite(err: Error | unknown, details?: any) {
    if (!this.#isMaster) {
      return;
    }
    this.error(err, details);
  }

  /** Should only be used by the InboxSDK users for their own app events. */
  eventApp(name: string, details?: any) {
    _trackEvent(this.#appId, 'app', name, details);
  }

  /**
   * For tracking app events that are possibly triggered by the user. Extensions
   * can opt out of this with a flag passed to InboxSDK.load().
   */
  eventSdkActive(name: string, details?: any) {
    if (!_extensionUseEventTracking) {
      return;
    }
    _trackEvent(this.#appId, 'sdkActive', name, details);
  }

  // Track events unrelated to user activity about how the app uses the SDK.
  // Examples include the app being initialized, and calls to any of the
  // register___ViewHandler functions.
  eventSdkPassive(name: string, details?: any, sensitive?: boolean) {
    if (sensitive && !isStreakAppId(this.#appId)) {
      // do not log events if they were marked as sensitive
      return;
    }

    _trackEvent(this.#appId, 'sdkPassive', name, details);
  }

  // Track Site events.
  eventSite(name: string, details?: any) {
    // Only the first logger instance reports Site events.
    if (!this.#isMaster) {
      return;
    }
    _trackEvent(this.#appId, 'gmail', name, details);
  }

  deprecationWarning(name: string, suggestion?: string) {
    console.warn(
      `InboxSDK: ${name} is deprecated.` +
        (suggestion ? ` Please use ${suggestion} instead.` : ''),
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
      event: (name, details) => this.eventApp(name, details),
    };
  }

  trackFunctionPerformance(
    fn: Function,
    sampleRate: number,
    details: { type: string; [key: string]: any },
  ) {
    if (
      Math.random() < sampleRate &&
      document.visibilityState === 'visible' &&
      this.#isMaster
    ) {
      const start = Date.now();
      fn();
      setTimeout(() => {
        const now = Date.now();
        this.eventSdkPassive('function performance result', {
          value: now - start,
          timeSinceFirstLoad: now - FIRST_LOADED_TIME,
          ...details,
        });
      }, 10);
    } else {
      fn();
    }
  }
}

function _extensionLoggerSetup(
  appId: string,
  opts: PiOpts,
  loaderVersion: string,
  implVersion: string,
) {
  _extensionAppIds.push(
    Object.freeze({
      appId: appId,
      version: opts.appVersion || undefined,
    }),
  );
  document.documentElement.setAttribute(
    'data-inboxsdk-active-app-ids',
    JSON.stringify(
      getAllAppIds().concat([
        {
          appId: appId,
          version: opts.appVersion || undefined,
        },
      ]),
    ),
  );

  if (_extensionLoaderVersion) {
    return;
  }

  _extensionLoaderVersion = loaderVersion;
  _extensionImplVersion = implVersion;
  _extensionUseEventTracking = opts.eventTracking;

  if (opts.globalErrorLogging) {
    if (Error.stackTraceLimit < 40) {
      Error.stackTraceLimit = 40;
    }

    window.addEventListener('error', function (event) {
      // Ugh, currently Chrome makes this pretty useless. Once Chrome fixes
      // this, we can remove the logged function wrappers around setTimeout and
      // things.
      if (event.error) {
        Logger.error(event.error, 'Uncaught exception');
      }
    });

    replaceFunction(window, 'setTimeout', function (original) {
      return function wrappedSetTimeout(this: any, ...args: any[]) {
        if (typeof args[0] == 'function') {
          args[0] = makeLoggedFunction(args[0], 'setTimeout callback');
        }
        return original.apply(this, args);
      };
    });

    replaceFunction(window, 'setInterval', function (original) {
      return function wrappedSetInterval(this: any, ...args: any[]) {
        if (typeof args[0] == 'function') {
          args[0] = makeLoggedFunction(args[0], 'setInterval callback');
        }
        return original.apply(this, args);
      };
    });

    const ETp =
      (window.EventTarget && window.EventTarget.prototype) ||
      window.Node.prototype;
    replaceFunction(ETp, 'addEventListener', function (original) {
      return function wrappedAddEventListener(this: any, ...args: any[]) {
        if (typeof args[1] == 'function') {
          try {
            // If we've made a logger for this function before, use it again,
            // otherwise attach it as a property to the original function.
            // This is necessary so that removeEventListener is called with
            // the right function.
            let loggedFn = args[1].__inboxsdk_logged;
            if (!loggedFn) {
              loggedFn = makeLoggedFunction(args[1], 'event listener');

              (args[1] as any).__inboxsdk_logged = loggedFn;
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

    replaceFunction(ETp, 'removeEventListener', function (original) {
      return function wrappedRemoveEventListener(this: any, ...args: any[]) {
        if (typeof args[1] == 'function' && args[1].__inboxsdk_logged) {
          args[1] = args[1].__inboxsdk_logged;
        }
        return original.apply(this, args);
      };
    });

    replaceFunction(window, 'MutationObserver', function (Original: any) {
      Original = Original || (window as any).WebKitMutationObserver;

      function WrappedMutationObserver(this: any, ...args: any[]) {
        if (typeof args[0] == 'function') {
          args[0] = makeLoggedFunction(args[0], 'MutationObserver callback');
        }
        if (Original.bind && Original.bind.apply) {
          // call constructor with variable number of arguments
          return new ((Original.bind as any).apply(
            Original,
            [null].concat(args),
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
  causedByAppId: string | null | undefined,
  onlyExtensionApps: boolean = true,
): any[] {
  const appIds = onlyExtensionApps ? _extensionAppIds : getAllAppIds();
  if (!causedByAppId) {
    return appIds;
  } else {
    const appIdsWithCause: any[] = appIds.slice();
    let hasSetCause = false;
    appIdsWithCause.forEach((entry, i) => {
      if (!hasSetCause && entry.appId === causedByAppId) {
        hasSetCause = true;
        appIdsWithCause[i] = { ...entry, causedBy: true };
      }
      Object.freeze(appIdsWithCause[i]);
    });
    return Object.freeze(appIdsWithCause) as any;
  }
}

// err should be an Error instance, and details can be any JSON-ifiable value.
function _logError(
  err: Error | unknown,
  details: any,
  appId: string | undefined,
  sentByApp: boolean,
) {
  logError(err, details, {
    appId,
    sentByApp,
    appIds: getAppIdsProperty(appId),
    loaderVersion: _extensionLoaderVersion,
    implVersion: _extensionImplVersion,
    userEmailHash: _extensionUserEmailHash,
  });
}

function makeLoggedFunction<F extends Function>(func: F, name?: string): F {
  const msg = name ? 'Uncaught error in ' + name : 'Uncaught error';
  return function (this: any, ...args: any[]) {
    return Logger.run(() => func.apply(this, args), msg);
  } as any;
}

function replaceFunction(
  parent: any,
  name: string,
  newFnMaker: (original: Function) => Function,
) {
  const newFn = newFnMaker(parent[name]);
  (newFn as any).__original = parent[name];
  parent[name] = newFn;
}

export function hashEmail(str: string): string {
  const hasher = new Sha256();
  hasher.update('inboxsdk:' + str);
  return hasher.digest('hex');
}

function _trackEvent(
  appId: string | null | undefined,
  type: string,
  eventName: string,
  properties: any,
) {
  if (properties && typeof properties != 'object') {
    throw new Error('properties must be object or null: ' + properties);
  }
  const event: object = {
    type: type,
    event: eventName,
    timestamp: Date.now() * 1000,
    origin: document.location.origin,
    sessionId: _sessionId,
    emailHash: _extensionUserEmailHash,
    loaderVersion: _extensionLoaderVersion,
    implementationVersion: _extensionImplVersion,
    properties: properties,
  };

  if (type != 'gmail') {
    Object.assign(event, {
      extensionId: getExtensionId(),
      appIds: getAppIdsProperty(appId),
    });
  } else {
    Object.assign(event, {
      appIds: getAppIdsProperty(null, false),
    });
  }

  if (typeof document === 'undefined') {
    return;
  }

  _trackedEventsQueue.add(event);

  // Signal to the logger master that a new event is ready to be sent.
  document.documentElement.setAttribute(
    'data-inboxsdk-last-event',
    '' + Date.now(),
  );
}

let currentAccessToken: null | {
  oauthToken: string;
  expirationDate: number;
} = null;

function isTimestampExpired(n: number) {
  // Let's refresh the token 10 minutes early
  return Date.now() + 10 * 60 * 1000 > n;
}

async function retrieveNewEventsAccessToken(): Promise<{
  oauthToken: string;
  expirationDate: number;
}> {
  const { text } = await ajax({
    url: 'https://api.inboxsdk.com/api/v2/events/oauth',
    // Work around CORB for extensions that have permissions to inboxsdk.com
    XMLHttpRequest: getXMLHttpRequest(),
  });
  const accessToken: any = JSON.parse(text);
  if (isTimestampExpired(accessToken.expirationDate)) {
    console.warn(
      'Got an apparently already expired token. Assuming our clock is busted...',
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

if (
  _extensionIsLoggerMaster &&
  typeof document !== 'undefined' &&
  typeof MutationObserver !== 'undefined'
) {
  makeMutationObserverStream(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-inboxsdk-last-event'],
  })
    .map(() => null)
    .throttle(120 * 1000)
    .onValue(function () {
      const events: any[] = _trackedEventsQueue.removeAll();

      // The trackedEventsQueue is in localStorage, which is shared between
      // multiple tabs. A different tab could have flushed it already recently.
      if (events.length === 0) {
        return;
      }

      (async function () {
        const { oauthToken } = await getEventsAccessToken();
        const apiKey = 'AIzaSyAwlvUR2x3OnCeas8hW8NDzVMswL5hZGg8';

        // TODO change to use CommonPageCommunicator.pageAjax()
        await ajax({
          url: `https://pubsub.googleapis.com/v1/projects/mailfoogae/topics/events:publish?key=${encodeURIComponent(
            apiKey,
          )}`,
          method: 'POST',
          headers: {
            Authorization: `Bearer ${oauthToken}`,
            'Content-Type': 'application/json',
          },
          data: JSON.stringify({
            messages: [
              {
                data: Buffer.from(
                  JSON.stringify({
                    data: events,
                    timestamp: Date.now() * 1000,
                  }),
                ).toString('base64'),
              },
            ],
          }),
        });
      })().catch((err) => {
        Logger.error(err, {
          type: 'Failed to log events',
        });
      });
    });
}
