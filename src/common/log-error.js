/* @flow */
//jshint ignore:start

const throttle = require('lodash/function/throttle');
import ajax from './ajax';
import getStackTrace from './get-stack-trace';
import getExtensionId from './get-extension-id';
import {BUILD_VERSION} from './version';

export type LogErrorContext = {
  appId?: ?string;
  appIds?: ?any[];
  sentByApp?: ?boolean;
  sessionId?: ?string;
  loaderVersion?: ?string;
  implVersion?: ?string;
  userEmailHash?: ?string;
};

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
    var {appId, appIds, sessionId, implVersion, userEmailHash} = context;
    const loaderVersion = context.loaderVersion || BUILD_VERSION;
    const sentByApp = !!context.sentByApp;

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

    console.error(...stuffToLog);

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
  } catch(err2) {
    tooManyErrors(err2, args);
  }
}

const _extensionSeenErrors: WeakSet<Error> = (() => {
  if (!global.__inboxsdk_extensionSeenErrors) {
    Object.defineProperty(global, '__inboxsdk_extensionSeenErrors', {
      value: new WeakSet()
    });
  }
  return global.__inboxsdk_extensionSeenErrors;
})();

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

const sendError = throttle(async function(report: Object) {
  const args = arguments;

  try {
    await ajax({
      url: 'https://www.inboxsdk.com/api/v2/errors',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      data: JSON.stringify(report)
    });
  } catch(err2) {
    tooManyErrors(err2, args);
  }
}, 1000);

function tooManyErrors(err2: Error, originalArgs: any) {
  console.error("ERROR REPORTING ERROR", err2);
  console.error("ORIGINAL ERROR", originalArgs);
}
