var assert = require('assert');
var RSVP = require('./lib/rsvp');
var run = require('./lib/run');

describe('injected thread identifier', function() {
  it('runs', function() {
    this.slow();
    return run('node', ['test/jsdom/injected-thread-identifier.js']);
  });
});
