var assert = require('assert');
var RSVP = require('../lib/rsvp');
var jsdom = require('../lib/jsdom');

require('../lib/fake-page-globals')();

process.env.VERSION = 'beep';

global.MutationObserver = require('../lib/mock-mutation-observer');
global.document = jsdom(`<!doctype html>
<html>
<body>
<div id="canvas"></div>
</body>
</html>`);
Object.defineProperty(document.location, 'origin', {value:'https://inbox.google.com'});
global.window = document.parentWindow;

// don't try to inject ajax interceptor
document.head.setAttribute('data-inboxsdk-script-injected', true);
document.head.setAttribute('data-inboxsdk-user-email-address', 'foo@example.com');
document.head.setAttribute('data-inboxsdk-user-name', 'Foo Bar');

var InboxSDK = require('./lib/inboxsdk');

var appOpts = {
  globalErrorLogging: false, inboxBeta: true
};

assert.strictEqual(InboxSDK.LOADER_VERSION, 'beep');

InboxSDK.load(1, "sdk_testfoo_2a9c68f994", appOpts).then(function(inboxsdk) {
  assert.strictEqual(inboxsdk.LOADER_VERSION, 'beep');
  assert.strictEqual(inboxsdk.IMPL_VERSION, 'beep');

  RSVP.all([
    InboxSDK.load(1, 'sdk_testfoo2_c65cc8c168', appOpts),
    InboxSDK.load(1, 'sdk_testfoo3_fc90e29e45', appOpts)
  ]).then(function(apps) {
    assert.notStrictEqual(apps[0], apps[1]);
    assert.strictEqual(apps[0].LOADER_VERSION, 'beep');
    assert.strictEqual(apps[0].IMPL_VERSION, 'beep');
    assert.strictEqual(apps[1].LOADER_VERSION, 'beep');
    assert.strictEqual(apps[1].IMPL_VERSION, 'beep');

    process.exit(0);
  });
}).catch(err => {
  console.error("Error", err);
  process.exit(7);
});
