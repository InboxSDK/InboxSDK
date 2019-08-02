/* eslint-disable flowtype/require-valid-file-annotation, no-undef */

if (!global.__InboxSDKInjected) {
  global.__InboxSDKInjected = true;

  const logger = require('./injected-logger');
  let oldDefine;
  try {
    if (typeof define !== 'undefined' && define && define.amd) {
      // work around amd compatibility issue
      // https://groups.google.com/forum/#!msg/inboxsdk/U_bq82Exmwc/I3iIinxxCAAJ
      oldDefine = define;
      define = null;
    }
    const xhrHelper = require('./xhr-helper').default;
    const setupDataExposer = require('./setup-data-exposer').default;
    const setupEventReemitter = require('./setup-event-reemitter').default;
    const setupErrorSilencer = require('./setup-error-silencer').default;
    const setupCustomViewEventAssassin = require('./setupCustomViewEventAssassin')
      .default;
    const setupPushStateListener = require('./setupPushStateListener').default;
    const setupInboxCustomViewLinkFixer = require('./setupInboxCustomViewLinkFixer')
      .default;

    const gmailInterceptor = require('./gmail/setup-gmail-interceptor').default;
    const setupGmonkeyHandler = require('./gmail/setup-gmonkey-handler')
      .default;

    const setupClickAndGetNewIframeSrc = require('./inbox/setupClickAndGetNewIframeSrc')
      .default;
    const setupInboxFakeWindowResizeListener = require('./inbox/setupInboxFakeWindowResizeListener')
      .default;
    const setupComposeViewDraftIDFinder = require('./inbox/setupComposeViewDraftIDFinder')
      .default;
    const setupInboxAjaxInterceptor = require('./inbox/setupAjaxInterceptor')
      .default;

    const pageOrigin: string =
      (process.env.NODE_ENV === 'test' && global.__test_origin) ||
      document.location.origin;

    if (pageOrigin === 'https://mail.google.com') {
      gmailInterceptor();
      setupGmonkeyHandler();
    } else if (pageOrigin === 'https://inbox.google.com') {
      setupClickAndGetNewIframeSrc();
      setupInboxFakeWindowResizeListener();
      setupComposeViewDraftIDFinder();
      setupInboxAjaxInterceptor();
    } else {
      throw new Error('Should not happen');
    }

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
