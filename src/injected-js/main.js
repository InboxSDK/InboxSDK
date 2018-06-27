/* eslint-disable flowtype/require-valid-file-annotation, no-undef */

if (!global.__InboxSDKInjected) {
  global.__InboxSDKInjected = true;

  const logger = require('./injected-logger');
  let oldDefine;
  try {
    if (typeof define !== "undefined" && define && define.amd) {
      // work around amd compatibility issue
      // https://groups.google.com/forum/#!msg/inboxsdk/U_bq82Exmwc/I3iIinxxCAAJ
      oldDefine = define;
      define = null;
    }
    const xhrHelper = require('./xhr-helper');
    const setupDataExposer = require('./setup-data-exposer');
    const setupEventReemitter = require('./setup-event-reemitter');
    const setupErrorSilencer = require('./setup-error-silencer');
    const setupCustomViewEventAssassin = require('./setupCustomViewEventAssassin');
    const setupPushStateListener = require('./setupPushStateListener');
    const setupInboxCustomViewLinkFixer = require('./setupInboxCustomViewLinkFixer');

    const gmailInterceptor = require('./gmail/setup-gmail-interceptor');
    const setupGmonkeyHandler = require('./gmail/setup-gmonkey-handler');

    const setupClickAndGetNewIframeSrc = require('./inbox/setupClickAndGetNewIframeSrc');
    const setupInboxFakeWindowResizeListener = require('./inbox/setupInboxFakeWindowResizeListener');
    const setupComposeViewDraftIDFinder = require('./inbox/setupComposeViewDraftIDFinder');
    const setupInboxAjaxInterceptor = require('./inbox/setupAjaxInterceptor');

    if (document.location.origin === 'https://mail.google.com') {
      gmailInterceptor();
      setupGmonkeyHandler();
    } else if (document.location.origin === 'https://inbox.google.com') {
      setupClickAndGetNewIframeSrc();
      setupInboxFakeWindowResizeListener();
      setupComposeViewDraftIDFinder();
      setupInboxAjaxInterceptor();
    } else {
      throw new Error("Should not happen");
    }

    xhrHelper();
    setupDataExposer();
    setupEventReemitter();
    setupErrorSilencer();
    setupCustomViewEventAssassin();
    setupPushStateListener();
    setupInboxCustomViewLinkFixer();
  } catch(err) {
    logger.error(err);
  } finally {
    if (oldDefine) {
      define = oldDefine;
    }
  }
}
