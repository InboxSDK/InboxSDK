var assert = require('assert');
var Bacon = require('baconjs');

var StopperBus = require('../src/platform-implementation-js/lib/stopper-bus');

describe('StopperBus', function() {
  it('should work with one stream', function(done) {
    var hasReachedEnd = false;
    var b1 = new Bacon.Bus();
    var ender = new StopperBus(b1), i = 0;
    ender.stream.subscribe(function(event) {
      switch(++i) {
        case 1:
          assert.equal(event.value(), null);
          assert(hasReachedEnd, 'has reached end');
          break;
        case 2:
          assert(event.isEnd());
          done();
          break;
        default:
          throw new Error("Should not happen");
      }
    });

    hasReachedEnd = true;
    b1.push(null);
    b1.end();
  });

  it('should work with two streams', function(done) {
    var hasReachedEnd = false;
    var b1 = new Bacon.Bus();
    var ender = new StopperBus(b1), i = 0;
    ender.stream.subscribe(function(event) {
      switch(++i) {
        case 1:
          assert.equal(event.value(), null);
          assert(hasReachedEnd, 'has reached end');
          break;
        case 2:
          assert(event.isEnd());
          done();
          break;
        default:
          throw new Error("Should not happen");
      }
    });

    var b2 = new Bacon.Bus();
    ender.add(b2);
    b1.push(null);
    b1.end();

    hasReachedEnd = true;
    b2.push(null);
    b2.end();
  });

  it('handles stream ending synchronously', function(done) {
    var ender = new StopperBus(Bacon.once(null));
    ender.stream.onEnd(done);
  });

  it('throws error if you try to add a stream after end', function() {
    var ender = new StopperBus(Bacon.once(null));
    assert.throws(function() {
      ender.add(Bacon.once(null));
    });
  });

  it('stops listening to streams after first event', function(done) {
    var ender = new StopperBus(new Bacon.Bus());
    ender.stream.subscribe(function() {
      throw new Error("Should not happen");
    });
    ender.add(Bacon.fromBinder(function(sink) {
      sink(1);
      return done;
    }));
  });

  it('supports arrays of streams', function(done) {
    var hasReachedEnd = false;
    var b1 = new Bacon.Bus();
    var b2 = new Bacon.Bus();
    var ender = new StopperBus([Bacon.once(null), b1.mapEnd(null)]);
    ender.stream.onValue(function() {
      assert(hasReachedEnd);
      done();
    });
    ender.add([b2.mapEnd(null), Bacon.once(null)]);
    b1.end();
    hasReachedEnd = true;
    b2.end();
  });

  it('getSize method works', function() {
    var hasEnded = false;
    var b1 = new Bacon.Bus();
    var b2 = new Bacon.Bus();
    var ender = new StopperBus(b1.mapEnd(null));
    ender.stream.onValue(function() {
      assert.strictEqual(ender.getSize(), 0);
      hasEnded = true;
    });
    assert.strictEqual(ender.getSize(), 1);
    ender.add(b2.mapEnd(null));
    assert.strictEqual(ender.getSize(), 2);
    b2.end();
    assert.strictEqual(ender.getSize(), 1);
    b1.end();
    assert.strictEqual(ender.getSize(), 0);
    assert(hasEnded, 'stopperbus has stopped');
  });
});
