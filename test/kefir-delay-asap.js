const assert = require('assert');
const Kefir = require('kefir');
const Marker = require('../src/common/marker');

import kefirDelayAsap from '../src/platform-implementation-js/lib/kefir-delay-asap';

function shouldNotBeCalled() {
  throw new Error("Should not be called");
}

describe('kefirDelayAsap', function() {
  it('should work in simple case', function(done) {
    let tooLate = false;
    setTimeout(() => {
      tooLate = true;
    }, 0);
    let tooEarly = true;
    let calls = 0;
    Kefir.constant(shouldNotBeCalled).flatMap(kefirDelayAsap).onAny(event => {
      switch (++calls) {
        case 1:
          assert.strictEqual(tooEarly, false);
          assert.strictEqual(tooLate, false);

          assert.strictEqual(event.type, 'value');
          assert.strictEqual(event.value, shouldNotBeCalled);
          break;
        case 2:
          assert.strictEqual(tooEarly, false);
          assert.strictEqual(tooLate, false);

          assert.strictEqual(event.type, 'end');
          done();
          break;
        default:
          throw new Error("Should not happen");
      }
    });
    tooEarly = false;
  });

  it('works with bufferBy', function(done) {
    const item1 = Marker('item1'), item2 = Marker('item2'), item3 = Marker('item3');
    const emitter = new Kefir.Emitter();
    let step = 0;
    emitter.bufferBy(emitter.flatMap(x => kefirDelayAsap())).onValue(x => {
      switch(step) {
        case 1:
          assert.deepEqual(x, [5, 6]);
          break;
        case 2:
          assert.deepEqual(x, [7, 8]);
          done();
          break;
        default:
          throw new Error("Should not happen");
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
});
