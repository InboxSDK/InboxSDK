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

  it('should not listen on streams after end', function() {
    var ender = new StopperBus(Bacon.once(null));
    ender.add(Bacon.fromBinder(function(sink) {
      throw new Error("Should not be subscribed to");
    }));
  });
});
