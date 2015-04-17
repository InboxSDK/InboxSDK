import assert from 'assert';
import Bacon from 'baconjs';

import baconFlatten from '../src/platform-implementation-js/lib/bacon-flatten';

describe("baconFlatten", function() {
  it("works", function(done) {
    let calls = 0;
    baconFlatten(Bacon.once([1,2,3])).subscribe(event => {
      switch (++calls) {
        case 1:
          assert(event instanceof Bacon.Next);
          assert.strictEqual(event.value(), 1);
          break;
        case 2:
          assert(event instanceof Bacon.Next);
          assert.strictEqual(event.value(), 2);
          break;
        case 3:
          assert(event instanceof Bacon.Next);
          assert.strictEqual(event.value(), 3);
          break;
        case 4:
          assert(event instanceof Bacon.End);
          done();
          break;
        default:
          throw new Error("Should not happen");
      }
    });
  });

  // See https://github.com/baconjs/bacon.js/issues/574
  it("doesn't cause reentry", function(done) {
    const someBus = new Bacon.Bus();
    someBus.onValue(()=>{});
    let calls = 0;
    let criticalSection = false;
    baconFlatten(Bacon.once([1,2])).subscribe(event => {
      if (criticalSection) {
        throw new Error("Re-entry!");
      }
      criticalSection = true;
      switch (++calls) {
        case 1:
          assert(event instanceof Bacon.Next);
          assert.strictEqual(event.value(), 1);
          someBus.end();
          break;
        case 2:
          assert(event instanceof Bacon.Next);
          assert.strictEqual(event.value(), 2);
          break;
        case 3:
          assert(event instanceof Bacon.End);
          done();
          break;
        default:
          throw new Error("Should not happen");
      }
      criticalSection = false;
    });
  });

  // When Bacon fixes this bug, this test will fail, and baconFlatten becomes unnecessary.
  it("Bacon.fromArray still causes re-entry", function(done) {
    const someBus = new Bacon.Bus();
    someBus.onValue(()=>{});
    let calls = 0;
    let criticalSection = false;
    let reentryHappened = false;
    Bacon.once([1,2]).flatMap(Bacon.fromArray).subscribe(event => {
      if (criticalSection) {
        reentryHappened = true;
      }
      criticalSection = true;
      switch (++calls) {
        case 1:
          assert(event instanceof Bacon.Next);
          assert.strictEqual(event.value(), 1);
          someBus.end();
          break;
        case 2:
          assert(event instanceof Bacon.Next);
          assert.strictEqual(event.value(), 2);
          break;
        case 3:
          assert(event instanceof Bacon.End);
          assert(reentryHappened);
          done();
          break;
        default:
          throw new Error("Should not happen");
      }
      criticalSection = false;
    });
  });
});
