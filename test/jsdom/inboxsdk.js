var assert = require('assert');
var RSVP = require('../lib/rsvp');
var jsdom = require('jsdom').jsdom;

var InboxSDK = require('./lib/inboxsdk');

global.MutationObserver = require('../lib/mock-mutation-observer');
global.document = jsdom('<!doctype html><html><body><div id="canvas"></div></body></html>');
global.window = document.parentWindow;

document.body.classList = []; // hack

process.env.VERSION = 'beep';
var inboxsdk = new InboxSDK("test", {
  TEMPORARY_INTERNAL_skipWeakMapRequirement: true,
  globalErrorLogging: false
});

assert.strictEqual(inboxsdk.VERSION, 'beep');
assert.strictEqual(inboxsdk.IMPL_VERSION, null);

return inboxsdk._platformImplementationLoader.load().then(function() {
  assert.strictEqual(inboxsdk.VERSION, 'beep');
  assert.strictEqual(inboxsdk.IMPL_VERSION, 'beep');

  process.exit(0);
});
