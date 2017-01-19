/* @flow */

import ajax from './ajax';
import rateLimit from './rate-limit';
import getStackTrace from './get-stack-trace';
import getExtensionId from './get-extension-id';
import getSessionId from './get-session-id';
import {BUILD_VERSION} from './version';
import isObject from 'lodash/isObject';

export type LogErrorContext = {
  appId?: ?string;
  appIds?: ?any[];
  sentByApp?: ?boolean;
  loaderVersion?: ?string;
  implVersion?: ?string;
  userEmailHash?: ?string;
};

const sessionId = getSessionId();

// code inside the platform-implementation should use logger.js instead of
// interacting with this directly!
export default function logError(err: Error, details: any, context: LogErrorContext) {
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
    var {appId, appIds, implVersion, userEmailHash} = context;
    const loaderVersion = context.loaderVersion || BUILD_VERSION;
    const sentByApp = !!context.sentByApp;

    const errorProperties: Object = {};
    for (let name in err) {
      if (Object.prototype.hasOwnProperty.call(err, name)) {
        try {
          const value = (err:any)[name];
          JSON.stringify(value);
          errorProperties[name] = value;
        } catch (err) {
          // ignore
        }
      }
    }
    if (Object.keys(errorProperties).length > 0) {
      details = {errorProperties, details};
    }

    // Might not have been passed a useful error object with a stack, so get
    // our own current stack just in case.
    const nowStack = getStackTrace();

    let stuffToLog: any[] = ["Error logged:", err];
    if (err && err.stack) {
      stuffToLog = stuffToLog.concat(["\n\nOriginal error stack:\n"+err.stack]);
    }
    stuffToLog = stuffToLog.concat(["\n\nError logged from:\n"+nowStack]);
    if (details) {
      stuffToLog = stuffToLog.concat(["\n\nError details:", details]);
    }
    stuffToLog = stuffToLog.concat(["\n\nExtension App Ids:", JSON.stringify(appIds, null, 2)]);
    stuffToLog = stuffToLog.concat(["\nSent by App:", sentByApp]);
    stuffToLog = stuffToLog.concat(["\nSession Id:", sessionId]);
    stuffToLog = stuffToLog.concat(["\nExtension Id:", getExtensionId()]);
    stuffToLog = stuffToLog.concat(["\nInboxSDK Loader Version:", loaderVersion]);
    stuffToLog = stuffToLog.concat(["\nInboxSDK Implementation Version:", implVersion]);

    console.error.apply(console, stuffToLog);

    const report = {
      message: err && err.message || err,
      stack: err && err.stack,
      loggedFrom: nowStack,
      details,
      appIds,
      sentByApp,
      sessionId,
      emailHash: userEmailHash,
      extensionId: getExtensionId(),
      loaderVersion: loaderVersion,
      implementationVersion: implVersion,
      origin: (document.location: any).origin,
      timestamp: Date.now()*1000
    };

    sendError(report);

    if (document.documentElement.getAttribute('inboxsdk-emit-error-event') === 'true') {
      document.documentElement.dispatchEvent(new CustomEvent('inboxSDKerror', {
        bubbles: false,
        cancelable: false,
        detail: {
          message: err && err.message || err,
          stack: err && err.stack,
          loggedFrom: nowStack,
          details,
          sentByApp
        }
      }));
    }
  } catch(err2) {
    tooManyErrors(err2, args);
  }
}

const _extensionSeenErrors: {has(e: Error): boolean, add(e: Error): void} = (() => {
  // Safari <9 doesn't have WeakSet and we don't want to pull in the polyfill,
  // so we make one out of a WeakMap.
  if (!global.__inboxsdk_extensionSeenErrors && global.WeakMap) {
    Object.defineProperty(global, '__inboxsdk_extensionSeenErrors', {
      value: new global.WeakMap()
    });
  }
  return {
    has(e: Error): boolean {
      if (global.__inboxsdk_extensionSeenErrors) {
        return global.__inboxsdk_extensionSeenErrors.has(e);
      } else {
        try {
          return !!(e: any).__inboxsdk_extensionHasSeenError;
        } catch(err) {
          console.error(err);
          return false;
        }
      }
    },
    add(e: Error) {
      if (global.__inboxsdk_extensionSeenErrors && global.__inboxsdk_extensionSeenErrors.set) {
        // It's a WeakMap.
        global.__inboxsdk_extensionSeenErrors.set(e, true);
      } else if (global.__inboxsdk_extensionSeenErrors && global.__inboxsdk_extensionSeenErrors.add) {
        // Older versions of inboxsdk.js initialized it as a WeakSet instead,
        // so handle that too.
        global.__inboxsdk_extensionSeenErrors.add(e);
      } else {
        try {
          Object.defineProperty((e: any), '__inboxsdk_extensionHasSeenError', {
            value: true
          });
        } catch(err) {
          console.error(err);
        }
      }
    }
  };
})();

function haveWeSeenThisErrorAlready(error: Error): boolean {
  if (isObject(error)) {
    return _extensionSeenErrors.has(error);
  }
  return false;
}

function markErrorAsSeen(error: Error) {
  if (isObject(error)) {
    _extensionSeenErrors.add(error);
  }
}

// Only let 10 errors be sent per minute.
const sendError = rateLimit(function(report: Object) {
  const args = arguments;

  try {
    ajax({
      url: 'https://www.inboxsdk.com/api/v2/errors',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      data: JSON.stringify(report)
    }).catch(err2 => {
      tooManyErrors(err2, args);
    });
  } catch(err2) {
    tooManyErrors(err2, args);
  }
}, 60*1000, 10);

function tooManyErrors(err2: Error, originalArgs: any) {
  console.error("ERROR REPORTING ERROR", err2);
  console.error("ORIGINAL ERROR", originalArgs);
}
