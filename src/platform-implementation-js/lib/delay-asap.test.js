/* @flow */

import Kefir from 'kefir';
import kefirBus from 'kefir-bus';

import delayAsap from './delay-asap';

function shouldNotBeCalled() {
  throw new Error('Should not be called');
}

it('should work in simple case', done => {
  let tooLate = false;
  setTimeout(() => {
    tooLate = true;
  }, 0);
  let tooEarly = true;
  let calls = 0;
  Kefir.constant(shouldNotBeCalled)
    .flatMap(delayAsap)
    .onAny(event => {
      switch (++calls) {
        case 1:
          expect(tooEarly).toBe(false);
          expect(tooLate).toBe(false);

          expect(event.type).toBe('value');
          expect(event.value).toBe(shouldNotBeCalled);
          break;
        case 2:
          expect(tooEarly).toBe(false);
          expect(tooLate).toBe(false);

          expect(event.type).toBe('end');
          done();
          break;
        default:
          throw new Error('Should not happen');
      }
    });
  tooEarly = false;
});

it('works with bufferBy', done => {
  const item1 = ['item1'],
    item2 = ['item2'],
    item3 = ['item3'];
  const emitter = kefirBus();
  let step = 0;
  emitter
    .bufferBy(emitter.flatMap(x => delayAsap()))
    .filter(x => x.length > 0)
    .onValue(x => {
      switch (step) {
        case 1:
          expect(x).toEqual([5, 6]);
          break;
        case 2:
          expect(x).toEqual([7, 8]);
          done();
          break;
        default:
          throw new Error('Should not happen');
      }
    });
  emitter.emit(5);
  emitter.emit(6);
  step = 1;
  setTimeout(() => {
    emitter.emit(7);
    emitter.emit(8);
    step = 2;
  }, 0);
});
