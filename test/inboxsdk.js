var assert = require('assert');
var sinon = require('sinon');
var RSVP = require('./lib/rsvp');
var jsdom = require('jsdom').jsdom;

var InboxSDK = require('./lib/inboxsdk');

describe('InboxSDK', function() {
  global.window = global.document = global.__InboxSDKImpLoader = null;
  global.MutationObserver = require('./lib/mock-mutation-observer');

  before(function() {
    global.document = jsdom('<!doctype html><html><body><div id="canvas"></div></body></html>');
    window = document.parentWindow;
    document.body.classList = []; // hack
  });

  after(function() {
    window.close();
    delete global.window;
    delete global.document;
    delete global.MutationObserver;
    delete global.__InboxSDKImpLoader;
  });

  it('should load', function() {
    this.slow();
    process.env.VERSION = 'beep';
    var inboxsdk = new InboxSDK("test", {globalErrorLogging: false});

    assert.strictEqual(inboxsdk.VERSION, 'beep');
    assert.strictEqual(inboxsdk.IMPL_VERSION, null);

    return inboxsdk._platformImplementationLoader.load().then(function() {
      assert.strictEqual(inboxsdk.VERSION, 'beep');
      assert.strictEqual(inboxsdk.IMPL_VERSION, 'beep');
    });
  });
});
