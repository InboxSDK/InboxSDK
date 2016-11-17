if (!global.__InboxSDKInjected) {
  global.__InboxSDKInjected = true;

  const logger = require('./injected-logger');
  var oldDefine;
  try {
    if (typeof define !== "undefined" && define && define.amd) {
      // work around amd compatibility issue
      // https://groups.google.com/forum/#!msg/inboxsdk/U_bq82Exmwc/I3iIinxxCAAJ
      oldDefine = define;
      define = null;
    }
    const _ = require('lodash');
    const RSVP = require('rsvp');
    const xhrHelper = require('./xhr-helper');
    const gmailInterceptor = require('./setup-gmail-interceptor');
    const setupGmonkeyHandler = require('./setup-gmonkey-handler');
    const setupDataExposer = require('./setup-data-exposer');
    const setupEventReemitter = require('./setup-event-reemitter');
    const setupErrorSilencer = require('./setup-error-silencer');
    const setupInboxFakeWindowResizeListener = require('./setupInboxFakeWindowResizeListener');

    const setupClickAndGetNewIframeSrc = require('./setupClickAndGetNewIframeSrc');
    const setupCustomViewEventAssassin = require('./setupCustomViewEventAssassin');

    RSVP.on('error', function(err) {
      console.error("Possibly uncaught promise rejection", err);
    });

    if (document.location.origin === 'https://mail.google.com') {
      gmailInterceptor();
      setupGmonkeyHandler();
    } else if (document.location.origin === 'https://inbox.google.com') {
      setupClickAndGetNewIframeSrc();
      setupInboxFakeWindowResizeListener();
    } else {
      throw new Error("Should not happen");
    }

    xhrHelper();
    setupDataExposer();
    setupEventReemitter();
    setupErrorSilencer();
    setupCustomViewEventAssassin();
  } catch(err) {
    logger.error(err);
  } finally {
    if (oldDefine) {
      define = oldDefine;
    }
  }
}
