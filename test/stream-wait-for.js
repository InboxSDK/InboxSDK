import assert from 'assert';
import sinon from 'sinon';
import Bacon from 'baconjs';

import streamWaitFor from '../src/platform-implementation-js/lib/stream-wait-for';

describe('streamWaitFor', function() {
  let clock;
  before(function() {
    clock = sinon.useFakeTimers();
  });
  after(function() {
    clock.restore();
  });

  it('should work', function(cb) {
    const conditionSpy = sinon.spy();
    var x = 0;
    const s = streamWaitFor(function() {
      var ready = ++x == 2;
      if (!ready)
        conditionSpy();
      return ready;
    }, 10, 1);

    const onValueSpy = sinon.spy();
    let tooEarly = true;
    s.onValue(function(result) {
      assert(!tooEarly);
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
    tooEarly = false;

    clock.tick(100);
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

    clock.tick(100);
  });

  it('should not call condition if not subscribed to', function() {
    const s = streamWaitFor(function() {
      throw new Error("Should not happen");
    });
    // streamWaitFor calls condition after a timeout usually, so give it a
    // moment to try.
    clock.tick(100);
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

    clock.tick(100);
  });

  it('will not timeout if unsubscribed from', function() {
    streamWaitFor(() => false, 2, 1)
      .takeUntil(Bacon.later(0))
      .onValue(() => {
        throw new Error("Should not happen");
      });

    clock.tick(100);
  });
});
