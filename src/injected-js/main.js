var _ = require('lodash');
var gmailInterceptor = require('./setup-gmail-interceptor');
var setupGmonkeyHandler = require('./setup-gmonkey-handler');

if (!global.__InboxSDKInjected) {
  global.__InboxSDKInjected = true;
  gmailInterceptor();
  setupGmonkeyHandler();
}
