var assert = require('assert');
var RSVP = require('./lib/rsvp');
var run = require('./lib/run');

describe('InboxSDK', function() {
  it('should load', function() {
    this.slow();
    return run('node', ['test/jsdom/inboxsdk.js']);
  });
});
