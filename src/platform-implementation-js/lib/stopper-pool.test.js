/* @flow */

import Kefir from 'kefir';
import kefirBus from 'kefir-bus';

import StopperPool from './stopper-pool';

it('should work with one stream', done => {
  let hasReachedEnd = false;
  let i = 0;
  const b1 = kefirBus();
  const ender = new StopperPool(b1);
  ender.stream.onAny(event => {
    switch(++i) {
      case 1:
        expect(event.type).toBe('value');
        expect(event.value).toBe(null);
        expect(hasReachedEnd).toBe(true);
        break;
      case 2:
        expect(event.type).toBe('end');
        done();
        break;
      default:
        throw new Error("Should not happen");
    }
  });

  hasReachedEnd = true;
  b1.emit(null);
  b1.end();
});

it('should work with two streams', done => {
  let hasReachedEnd = false;
  let i = 0;
  const b1 = kefirBus();
  const ender = new StopperPool(b1);
  ender.stream.onAny(event => {
    switch(++i) {
      case 1:
        expect(event.type).toBe('value');
        expect(event.value).toBe(null);
        expect(hasReachedEnd).toBe(true);
        break;
      case 2:
        expect(event.type).toBe('end');
        done();
        break;
      default:
        throw new Error("Should not happen");
    }
  });

  const b2 = kefirBus();
  ender.add(b2);
  b1.emit(null);
  b1.end();

  hasReachedEnd = true;
  b2.emit(null);
  b2.end();
});

it('handles stream ending synchronously', done => {
  const ender = new StopperPool(Kefir.constant(null));
  ender.stream.onEnd(done);
});

it('throws error if you try to add a stream after end', () => {
  const ender = new StopperPool(Kefir.constant(null));
  expect(() => {
    ender.add(Kefir.constant(null));
  }).toThrowError();
});

it('stops listening to streams after first event', done => {
  const ender = new StopperPool(kefirBus());
  ender.stream.onAny(() => {
    throw new Error("Should not happen");
  });
  ender.add(Kefir.stream(emitter => {
    emitter.emit(1);
    return done;
  }));
});

it('supports arrays of streams', done => {
  let hasReachedEnd = false;
  const b1 = kefirBus();
  const b2 = kefirBus();
  const ender = new StopperPool([Kefir.constant(null), b1.beforeEnd(()=>null)]);
  ender.stream.onValue(() => {
    expect(hasReachedEnd).toBe(true);
    done();
  });
  ender.add([b2.beforeEnd(()=>null), Kefir.constant(null)]);
  b1.end();
  hasReachedEnd = true;
  b2.end();
});

it('getSize method works', () => {
  let hasEnded = false;
  const b1 = kefirBus();
  const b2 = kefirBus();
  const ender = new StopperPool(b1.beforeEnd(()=>null));
  ender.stream.onValue(() => {
    expect(ender.getSize()).toBe(0);
    hasEnded = true;
  });
  expect(ender.getSize()).toBe(1);
  ender.add(b2.beforeEnd(()=>null));
  expect(ender.getSize()).toBe(2);
  b2.end();
  expect(ender.getSize()).toBe(1);
  b1.end();
  expect(ender.getSize()).toBe(0);
  expect(hasEnded).toBe(true);
});
