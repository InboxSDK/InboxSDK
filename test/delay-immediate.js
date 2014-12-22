var assert = require('assert');
var Bacon = require('baconjs');

var delayImmediate = require('../src/platform-implementation-js/lib/delay-immediate');

function shouldNotBeCalled() {
  throw new Error("Should not be called");
}

describe('delayImmediate', function() {
  it('should work in simple case', function(done) {
    var tooLate = false;
    setTimeout(function() {
      tooLate = true;
    }, 0);
    var tooEarly = true;
    var calls = 0;
    delayImmediate(Bacon.once(shouldNotBeCalled)).subscribe(function(event) {
      switch (++calls) {
        case 1:
          assert.strictEqual(tooEarly, false);
          assert.strictEqual(tooLate, false);

          assert(event instanceof Bacon.Next);
          assert.strictEqual(event.value(), shouldNotBeCalled);
          break;
        case 2:
          assert.strictEqual(tooEarly, false);
          assert.strictEqual(tooLate, false);

          assert(event instanceof Bacon.End);
          done();
          break;
        default:
          throw new Error("Should not happen");
      }
    });
    tooEarly = false;
  });
});
