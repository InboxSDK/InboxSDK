var assert = require('assert');
var RSVP = require('../lib/rsvp');
var jsdom = require('../lib/jsdom');

process.env.VERSION = 'beep';

var InboxSDK = require('./lib/inboxsdk');

global.MutationObserver = require('../lib/mock-mutation-observer');
global.document = jsdom('<!doctype html><html><body><div id="canvas"></div></body></html>');
global.window = document.parentWindow;

// don't try to inject ajax interceptor
document.head.setAttribute('data-inboxsdk-script-injected', true);

assert.strictEqual(InboxSDK.LOADER_VERSION, 'beep');
assert.strictEqual(InboxSDK.IMPL_VERSION, null);

var appOpts = {
  TEMPORARY_INTERNAL_skipWeakMapRequirement: true,
  globalErrorLogging: false
};
var inboxsdk = new InboxSDK("test", appOpts);

assert.strictEqual(inboxsdk.LOADER_VERSION, 'beep');
assert.strictEqual(inboxsdk.IMPL_VERSION, null);

inboxsdk._platformImplementationLoader.load().then(function() {
  assert.strictEqual(InboxSDK.LOADER_VERSION, 'beep');
  assert.strictEqual(InboxSDK.IMPL_VERSION, 'beep');

  assert.strictEqual(inboxsdk.LOADER_VERSION, 'beep');
  assert.strictEqual(inboxsdk.IMPL_VERSION, 'beep');

  RSVP.all([
    InboxSDK.newApp('new1', appOpts),
    InboxSDK.newApp('new2', appOpts)
  ]).then(function(apps) {
    assert.notStrictEqual(apps[0], apps[1]);
    assert.strictEqual(apps[0].LOADER_VERSION, 'beep');
    assert.strictEqual(apps[0].IMPL_VERSION, 'beep');
    assert.strictEqual(apps[1].LOADER_VERSION, 'beep');
    assert.strictEqual(apps[1].IMPL_VERSION, 'beep');

    process.exit(0);
  });
});
