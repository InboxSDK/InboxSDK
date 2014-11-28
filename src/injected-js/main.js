var _ = require('lodash');
var gmailInterceptor = require('./setup-gmail-interceptor');

if (!global.__InboxSDKInjected) {
  global.__InboxSDKInjected = true;
  gmailInterceptor();
}
