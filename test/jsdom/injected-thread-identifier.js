var assert = require('assert');
var RSVP = require('../lib/rsvp');
var jsdom = require('../lib/jsdom');
var fs = require('fs');

require('../lib/fake-page-globals')();

global.document = jsdom(fs.readFileSync(__dirname+'/injected-thread-identifier.html', 'utf8'));
global.window = document.parentWindow;

var threadIdentifier = require('../../src/injected-js/thread-identifier');
var PageCommunicator = require('../../src/platform-implementation-js/dom-driver/gmail/gmail-page-communicator');

var pageCommunicator = new PageCommunicator();

threadIdentifier.setup();

// Identify a regular email
assert.strictEqual(pageCommunicator.getThreadIdForThreadRow(document.getElementById(':3r')), '14a3481b07c29fcf');

// Fail to identify an ambiguous email that has no click handler
var amb = document.getElementById(':3g');
assert.strictEqual(pageCommunicator.getThreadIdForThreadRow(amb), null);

// Fail to identify another ambiguous email that has no click handler
var amb2 = document.getElementById(':35');
assert.strictEqual(pageCommunicator.getThreadIdForThreadRow(amb2), null);

// Identify an email using its click handler
var clickedCount = 0;
amb.addEventListener('click', function(event) {
  clickedCount++;
  var win = window.open('?ui=2&view=btop&ver=v0f5rr5r5c17&search=inbox&th=14a5f1c5ad340727&cvid=1', '_blank');

  // Any errors in the click handler are silenced
  setTimeout(function() {
    var requiredProps = {ctrlKey: true, altKey: false, shiftKey: false, metaKey: true};
    Object.keys(requiredProps).forEach(function(key) {
      assert.strictEqual(event[key], requiredProps[key]);
    });
    assert(!win.closed && win.focus);
    assert.equal(clickedCount, 1);
  }, 0);
});
assert.strictEqual(pageCommunicator.getThreadIdForThreadRow(amb), '14a5f1c5ad340727');

// Identify it again by using the cached value. No clicking allowed.
assert.strictEqual(pageCommunicator.getThreadIdForThreadRow(amb), '14a5f1c5ad340727');

// Continue to fail to identify the other ambiguous email
assert.strictEqual(pageCommunicator.getThreadIdForThreadRow(amb2), null);

// Fail to identify an email that was edited out of the original VIEW_DATA
var missing = document.getElementById(':74');
assert.strictEqual(pageCommunicator.getThreadIdForThreadRow(missing), null);

// Intercept some AJAX data
threadIdentifier.processThreadListResponse(fs.readFileSync(__dirname+'/injected-thread-identifier-ajax.txt', 'utf8'));

// Can still identify regular email
assert.strictEqual(pageCommunicator.getThreadIdForThreadRow(document.getElementById(':4d')), '149bf3ae4702f5a7');

// Can now identify that missing email
assert.strictEqual(pageCommunicator.getThreadIdForThreadRow(missing), '1477fe06f5924590');
