/* eslint-disable @typescript-eslint/no-var-requires */
declare let define: any;

// Protections against https://github.com/w3c/webextensions/issues/8 before
// running for browsers that don't support the documentIds option to
// scripting.executeScript():
// 1. Check the page URL to make sure the page hasn't been navigated away from
//    Gmail since the injection was requested.
// 2. Check that the document.head attribute the InboxSDK sets in the document
//    before injection is present, to make sure we're not in the situation where
//    the page has refreshed since the injection was requested and a new
//    injection was not requested yet.
// 3. Check that a global variable this script sets is not already set to make
//    sure this script isn't running twice, to make sure we don't run twice if
//    we're in the situation where the page has refreshed since the injection
//    was requested and another injection was requested too.

const pageOrigin: string =
  (process.env.NODE_ENV === 'test' && global.__test_origin) ||
  document.location.origin;

if (pageOrigin !== 'https://mail.google.com') {
  throw new Error(
    "Should not happen: InboxSDK pageWorld.js running in document that didn't request it.",
  );
}

if (!document.head?.hasAttribute('data-inboxsdk-script-injected')) {
  throw new Error(
    "Should not happen: InboxSDK pageWorld.js running in document that didn't request it.",
  );
}

if (!(global as any).__InboxSDKInjected) {
  (global as any).__InboxSDKInjected = true;

  const logger = require('./injected-logger');

  let oldDefine;

  try {
    if (typeof define !== 'undefined' && define && define.amd) {
      // work around amd compatibility issue
      // https://groups.google.com/forum/#!msg/inboxsdk/U_bq82Exmwc/I3iIinxxCAAJ
      oldDefine = define;
      define = null;
    }

    const extCorbWorkaroundPageWorld = require('ext-corb-workaround/dist/src/pageWorld');

    const xhrHelper = require('./xhr-helper').default;

    const setupDataExposer = require('./setup-data-exposer').default;

    const setupEventReemitter = require('./setup-event-reemitter').default;

    const setupErrorSilencer = require('./setup-error-silencer').default;

    const setupCustomViewEventAssassin =
      require('./setupCustomViewEventAssassin').default;

    const setupPushStateListener = require('./setupPushStateListener').default;

    const setupInboxCustomViewLinkFixer =
      require('./setupInboxCustomViewLinkFixer').default;

    const gmailInterceptor = require('./gmail/setup-gmail-interceptor').default;

    const setupGmonkeyHandler =
      require('./gmail/setup-gmonkey-handler').default;

    gmailInterceptor();
    setupGmonkeyHandler();

    extCorbWorkaroundPageWorld.init();
    xhrHelper();
    setupDataExposer();
    setupEventReemitter();
    setupErrorSilencer();
    setupCustomViewEventAssassin();
    setupPushStateListener();
    setupInboxCustomViewLinkFixer();
  } catch (err) {
    logger.error(err);
  } finally {
    if (oldDefine) {
      define = oldDefine;
    }
  }
}
