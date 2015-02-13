const assert = require('assert');
const Bacon = require('baconjs');
const Marker = require('../src/common/marker');

const delayAsap = require('../src/platform-implementation-js/lib/delay-asap');

function shouldNotBeCalled() {
  throw new Error("Should not be called");
}

describe('delayAsap', function() {
  it('should work in simple case', function(done) {
    var tooLate = false;
    setTimeout(() => {
      tooLate = true;
    }, 0);
    var tooEarly = true;
    var calls = 0;
    Bacon.once(shouldNotBeCalled).flatMap(delayAsap).subscribe(event => {
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

  it('works with multiple items', function(done) {
    const item1 = Marker('item1'), item2 = Marker('item2'), item3 = Marker('item3');
    const stream = Bacon.fromArray([item1, item2]).merge(Bacon.later(1, item3));

    var tooLate = false;
    setTimeout(() => {
      tooLate = true;
    }, 0);
    var tooEarly = true;

    var calls = 0;
    stream.flatMap(delayAsap).onValue(value => {
      switch (++calls) {
        case 1:
          assert.strictEqual(tooEarly, false);
          assert.strictEqual(tooLate, false);
          assert.strictEqual(value, item1);
          break;
        case 2:
          assert.strictEqual(tooEarly, false);
          assert.strictEqual(tooLate, false);
          assert.strictEqual(value, item2);
          break;
        case 3:
          assert.strictEqual(tooEarly, false);
          assert.strictEqual(tooLate, true);
          assert.strictEqual(value, item3);
          done();
          break;
        default:
          throw new Error("Should not happen");
      }
    });
    tooEarly = false;
  });
});
