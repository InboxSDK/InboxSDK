var assert = require('assert');
var sinon = require('sinon');
var RSVP = require('./lib/rsvp');
var env = require('jsdom').env;

var InboxSDK = require('./lib/inboxsdk');

describe('InboxSDK', function() {
  global.window = global.document = global.__InboxSDKImpLoader = null;
  global.MutationObserver = require('./lib/mock-mutation-observer');

  before(function() {
    return new RSVP.Promise(function(resolve, reject) {
      env('<!doctype html><html><body><div id="canvas"></div></body></html>', function (errs, _window) {
        if (errs) {
          reject(errs);
          return;
        }
        window = _window;
        document = window.document;
        document.body.classList = []; // hack
        resolve();
      });
    });
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
