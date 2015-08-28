/* @flow */
//jshint ignore:start

var assert = require('assert');
var Kefir = require('kefir');
var kefirBus: () => Kefir.Bus = require('kefir-bus');

import StopperPool from '../src/platform-implementation-js/lib/stopper-pool';

describe('StopperPool', function() {
  it('should work with one stream', function(done) {
    var hasReachedEnd = false;
    var b1 = kefirBus();
    var ender = new StopperPool(b1), i = 0;
    ender.stream.onAny(function(event) {
      switch(++i) {
        case 1:
          assert.equal(event.type, 'value');
          assert.equal(event.value, null);
          assert(hasReachedEnd, 'has reached end');
          break;
        case 2:
          assert.equal(event.type, 'end');
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

  it('should work with two streams', function(done) {
    var hasReachedEnd = false;
    var b1 = kefirBus();
    var ender = new StopperPool(b1), i = 0;
    ender.stream.onAny(function(event) {
      switch(++i) {
        case 1:
          assert.equal(event.type, 'value');
          assert.equal(event.value, null);
          assert(hasReachedEnd, 'has reached end');
          break;
        case 2:
          assert.equal(event.type, 'end');
          done();
          break;
        default:
          throw new Error("Should not happen");
      }
    });

    var b2 = kefirBus();
    ender.add(b2);
    b1.emit(null);
    b1.end();

    hasReachedEnd = true;
    b2.emit(null);
    b2.end();
  });

  it('handles stream ending synchronously', function(done) {
    var ender = new StopperPool(Kefir.constant(null));
    ender.stream.onEnd(done);
  });

  it('throws error if you try to add a stream after end', function() {
    var ender = new StopperPool(Kefir.constant(null));
    assert.throws(() => {
      ender.add(Kefir.constant(null));
    });
  });

  it('stops listening to streams after first event', function(done) {
    var ender = new StopperPool(kefirBus());
    ender.stream.onAny(function() {
      throw new Error("Should not happen");
    });
    ender.add(Kefir.stream(emitter => {
      emitter.emit(1);
      return done;
    }));
  });

  it('supports arrays of streams', function(done) {
    var hasReachedEnd = false;
    var b1 = kefirBus();
    var b2 = kefirBus();
    var ender = new StopperPool([Kefir.constant(null), b1.beforeEnd(()=>null)]);
    ender.stream.onValue(function() {
      assert(hasReachedEnd);
      done();
    });
    ender.add([b2.beforeEnd(()=>null), Kefir.constant(null)]);
    b1.end();
    hasReachedEnd = true;
    b2.end();
  });

  it('getSize method works', function() {
    var hasEnded = false;
    var b1 = kefirBus();
    var b2 = kefirBus();
    var ender = new StopperPool(b1.beforeEnd(()=>null));
    ender.stream.onValue(function() {
      assert.strictEqual(ender.getSize(), 0);
      hasEnded = true;
    });
    assert.strictEqual(ender.getSize(), 1);
    ender.add(b2.beforeEnd(()=>null));
    assert.strictEqual(ender.getSize(), 2);
    b2.end();
    assert.strictEqual(ender.getSize(), 1);
    b1.end();
    assert.strictEqual(ender.getSize(), 0);
    assert(hasEnded, 'stopperbus has stopped');
  });
});
