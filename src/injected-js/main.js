if (!global.__InboxSDKInjected) {
  global.__InboxSDKInjected = true;

  const _ = require('lodash');
  const RSVP = require('rsvp');
  const xhrHelper = require('./xhr-helper');
  const gmailInterceptor = require('./setup-gmail-interceptor');
  const setupGmonkeyHandler = require('./setup-gmonkey-handler');
  const setupDataExposer = require('./setup-data-exposer');
  const setupEventReemitter = require('./setup-event-reemitter');

  RSVP.on('error', function(err) {
    console.error("Possibly uncaught promise rejection", err);
  });

  if (document.location.origin === 'https://mail.google.com') {
    gmailInterceptor();
    setupGmonkeyHandler();
  } else if (document.location.origin === 'https://inbox.google.com') {
    // inbox-specific magic goes here
  } else {
    throw new Error("Should not happen");
  }

  xhrHelper();
  setupDataExposer();
  setupEventReemitter();
}
