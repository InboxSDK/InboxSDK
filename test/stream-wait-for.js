var assert = require('assert');
var sinon = require('sinon');
var Bacon = require('baconjs');

var streamWaitFor = require('../src/platform-implementation-js/lib/stream-wait-for');

describe('streamWaitFor', function() {
  it('should work', function(cb) {
    var conditionSpy = sinon.spy();
    var x = 0;
    var s = streamWaitFor(function() {
      var ready = ++x == 2;
      if (!ready)
        conditionSpy();
      return ready;
    }, 10, 1);

    var onValueSpy = sinon.spy();
    s.onValue(function(result) {
      assert.strictEqual(result, true);
      assert.equal(x, 2, 'check that condition has passed');
      assert.equal(conditionSpy.called, 1, 'check that condition failed once');
      onValueSpy();
    });
    s.onError(function() {
      throw new Error("Should not happen");
    });
    s.onEnd(function() {
      assert.equal(onValueSpy.called, 1, 'check that onValue was called once');
      cb();
    });
  });

  it('should support Bacon.Error', function(cb) {
    var onErrorSpy = sinon.spy();
    var s = streamWaitFor(function() {
      return new Bacon.Error("TEST");
    }, 10, 1);
    s.onValue(function() {
      throw new Error("Should not happen");
    });
    s.onError(function(err) {
      assert.strictEqual(err, "TEST");
      onErrorSpy();
    });
    s.onEnd(function() {
      assert.equal(onErrorSpy.called, 1, 'check that onValue was called once');
      cb();
    });
  });

  it('should not call condition if not subscribed to', function(cb) {
    var s = streamWaitFor(function() {
      throw new Error("Should not happen");
    });

    // streamWaitFor calls condition after a timeout usually, so give it a
    // moment to try.
    setTimeout(cb, 0);
  });

  it('should stop calling condition when unsubscribed from inside condition', function(cb) {
    var stopper = new Bacon.Bus();
    var calls = 0;
    var s = streamWaitFor(function() {
      if (++calls === 1) {
        stopper.push();
        setTimeout(cb, 0);
      } else {
        throw new Error("Should not happen");
      }
    }, 10, 1);
    s.takeUntil(stopper).onValue(function() {
      throw new Error("Should not happen");
    });
  });
});
