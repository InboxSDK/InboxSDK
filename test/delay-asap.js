var assert = require('assert');
var Bacon = require('baconjs');

var delayAsap = require('../src/platform-implementation-js/lib/delay-asap');

function shouldNotBeCalled() {
  throw new Error("Should not be called");
}

describe('delayAsap', function() {
  it('should work in simple case', function(done) {
    var tooLate = false;
    setTimeout(function() {
      tooLate = true;
    }, 0);
    var tooEarly = true;
    var calls = 0;
    Bacon.once(shouldNotBeCalled).flatMap(delayAsap).subscribe(function(event) {
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
