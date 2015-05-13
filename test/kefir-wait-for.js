import assert from 'assert';
import sinon from 'sinon';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';

import kefirWaitFor from '../src/platform-implementation-js/lib/kefir-wait-for';

describe('kefirWaitFor', function() {
  it('should work', function(cb) {
    const conditionSpy = sinon.spy();
    let x = 0;
    const s = kefirWaitFor(function() {
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
  });

  it('should not call condition if not subscribed to', function(cb) {
    const s = kefirWaitFor(function() {
      throw new Error("Should not happen");
    });

    // kefirWaitFor calls condition after a timeout usually, so give it a
    // moment to try.
    setTimeout(cb, 0);
  });

  it('should stop calling condition when unsubscribed from inside condition', function(cb) {
    const stopper = kefirStopper();
    var calls = 0;
    var s = kefirWaitFor(function() {
      if (++calls === 1) {
        stopper.destroy();
        setTimeout(cb, 0);
      } else {
        throw new Error("Should not happen");
      }
    }, 10, 1);
    s.takeUntilBy(stopper).onValue(function() {
      throw new Error("Should not happen");
    });
  });

  it('will not timeout if unsubscribed from', function(cb) {
    kefirWaitFor(() => false, 2, 1)
      .takeUntilBy(Kefir.later(0))
      .onValue(() => {
        throw new Error("Should not happen");
      });
    setTimeout(cb, 4);
  });
});
