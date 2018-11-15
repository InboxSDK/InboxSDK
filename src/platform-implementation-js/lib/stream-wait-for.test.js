/* @flow */

import sinon from 'sinon';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import delay from 'pdelay';

import streamWaitFor from './stream-wait-for';

it('should work', cb => {
  const conditionSpy = sinon.spy();
  let x = 0;
  const s = streamWaitFor(
    () => {
      const ready = ++x == 2;
      if (!ready) conditionSpy();
      return ready;
    },
    10,
    1
  );

  const onValueSpy = sinon.spy();
  let tooEarly = true;
  s.onValue(result => {
    expect(tooEarly).toBe(false);
    expect(result).toBe(true);
    expect(x).toBe(2); // check that condition has passed
    expect(conditionSpy.callCount).toBe(1); // check that condition failed once
    onValueSpy();
  });
  s.onError(() => {
    throw new Error('Should not happen');
  });
  s.onEnd(() => {
    expect(onValueSpy.callCount).toBe(1); // check that onValue was called once
    cb();
  });
  tooEarly = false;
});

it('should not call condition if not subscribed to', async () => {
  const s = streamWaitFor(() => {
    throw new Error('Should not happen');
  });

  // streamWaitFor calls condition after a timeout usually, so give it a
  // moment to try.
  await delay(20);
});

it('should stop calling condition when unsubscribed from inside condition', cb => {
  const stopper = kefirStopper();
  let calls = 0;
  const s = streamWaitFor(
    () => {
      if (++calls === 1) {
        stopper.destroy();
        setTimeout(cb, 0);
      } else {
        throw new Error('Should not happen');
      }
    },
    10,
    1
  );
  s.takeUntilBy(stopper).onValue(() => {
    throw new Error('Should not happen');
  });
});

it('will not timeout if unsubscribed from', async () => {
  streamWaitFor(() => false, 2, 1)
    .takeUntilBy(Kefir.later(0))
    .onValue(() => {
      throw new Error('Should not happen');
    });
  await delay(20);
});

it('will check condition before timeout', async () => {
  const spy = sinon.spy();
  let x = null;
  streamWaitFor(() => x, 50, 1000).onValue(spy);
  await delay(20);
  x = {};
  await delay(40);

  expect(spy.callCount).toBe(1);
  expect(spy.firstCall.args[0]).toBe(x);
});
