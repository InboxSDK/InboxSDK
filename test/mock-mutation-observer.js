var assert = require('assert');
var RSVP = require('./lib/rsvp');
var EventEmitter = require('events').EventEmitter;

var MutationObserver = require('./lib/mock-mutation-observer');

describe('MockMutationObserver', function() {
  it('should work', function() {
    return new RSVP.Promise(function(resolve, reject) {
      var mutation1 = {};
      var mutation2 = {};

      var obs = new MutationObserver(function(mutations) {
        assert.strictEqual(mutations.length, 2);
        assert.strictEqual(mutations[0], mutation1);
        assert.strictEqual(mutations[1], mutation2);
        resolve();
      });

      var el = new EventEmitter();
      el._emitsMutations = true;
      obs.observe(el, {});

      el.emit('mutation', mutation1);
      el.emit('mutation', mutation2);
    });
  });

  it('can disconnect', function() {
    return new RSVP.Promise(function(resolve, reject) {
      var mutationBad = {};
      var mutationGood = {};

      var obs = new MutationObserver(function(mutations) {
        assert.strictEqual(mutations.length, 1);
        assert.strictEqual(mutations[0], mutationGood);
        resolve();
      });

      var elBad = new EventEmitter();
      elBad._emitsMutations = true;
      obs.observe(elBad, {});
      elBad.emit('mutation', mutationBad);

      obs.disconnect();
      elBad.emit('mutation', mutationBad);

      var elGood = new EventEmitter();
      elGood._emitsMutations = true;
      obs.observe(elGood, {});
      elGood.emit('mutation', mutationGood);
    });
  });
});
