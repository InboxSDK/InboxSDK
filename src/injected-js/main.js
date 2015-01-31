var _ = require('lodash');
var RSVP = require('rsvp');
var gmailInterceptor = require('./setup-gmail-interceptor');
var setupGmonkeyHandler = require('./setup-gmonkey-handler');
var setupDataExposer = require('./setup-data-exposer');

if (!global.__InboxSDKInjected) {
  global.__InboxSDKInjected = true;

  RSVP.on('error', function(err) {
    console.error("Possibly uncaught promise rejection", err);
  });

  gmailInterceptor();
  setupGmonkeyHandler();
  setupDataExposer();
}
