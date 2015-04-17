var assert = require('assert');
var Bacon = require('baconjs');
var EventEmitter = require('events').EventEmitter;
var Marker = require('../src/common/marker');
const MockElementParent = require('./lib/mock-element-parent');

var makeElementChildStream = require('../src/platform-implementation-js/lib/dom/make-element-child-stream');

describe('makeElementChildStream', function() {
  global.MutationObserver = null;
  before(function() {
    global.MutationObserver = require('./lib/mock-mutation-observer');
  });
  after(function() {
    delete global.MutationObserver;
  });

  it('should work', function(done) {
    var child1 = Marker('child1'), child2 = Marker('child2'), child3 = Marker('child3');

    const target = new MockElementParent([child1, child2]);

    var call = 0;
    makeElementChildStream(target).onValue(function(event) {
      switch(++call) {
        case 1:
          assert.strictEqual(event.el, child1);
          event.removalStream.onValue(function() {
            target.appendChild(child3);
          });
          break;
        case 2:
          assert.strictEqual(event.el, child2);
          assert(event.removalStream instanceof Bacon.EventStream);
          break;
        case 3:
          assert.strictEqual(event.el, child3);
          assert(event.removalStream instanceof Bacon.EventStream);
          done();
          break;
        default:
          throw new Error("should not happen");
      }
    });

    setTimeout(function() {
      target.removeChild(child1);
    }, 0);
  });

  it('triggers removals when no longer listened on', function(done) {
    var child1 = Marker('child1'), child2 = Marker('child2');
    var stopper = new Bacon.Bus();

    const target = new MockElementParent([child1]);

    var call = 0;
    var child1Removed = 0, child2Removed = 0;
    var child1Ended = false, child2Ended = false;
    var stream = makeElementChildStream(target).takeUntil(stopper);
    stream.onValue(function(event) {
      switch(++call) {
        case 1:
          assert.strictEqual(event.el, child1);
          event.removalStream.onValue(function() {
            child1Removed++;
          });
          event.removalStream.onEnd(function() {
            child1Ended = true;
          });
          setTimeout(function() {
            target.appendChild(child2);
          }, 0);
          break;
        case 2:
          assert.strictEqual(event.el, child2);
          event.removalStream.onValue(function() {
            child2Removed++;
          });
          event.removalStream.onEnd(function() {
            child2Ended = true;
          });

          assert.strictEqual(child1Removed, 0);
          assert.strictEqual(child2Removed, 0);
          assert(!child1Ended);
          assert(!child2Ended);
          stopper.push();
          break;
        default:
          throw new Error("should not happen");
      }
    });
    stream.onEnd(function() {
      setTimeout(function() {
        assert.strictEqual(child1Removed, 1);
        assert.strictEqual(child2Removed, 1);
        assert(child1Ended);
        assert(child2Ended);
        done();
      }, 0);
    });
  });

  it("doesn't miss children added during initial emits", function(done) {
    const child1 = Marker('child1'), child2 = Marker('child2');

    const target = new MockElementParent([child1]);

    var i = 0;
    const stream = makeElementChildStream(target);
    stream.onValue(event => {
      switch(++i) {
        case 1:
          assert.strictEqual(event.el, child1);
          target.appendChild(child2);
          break;
        case 2:
          assert.strictEqual(event.el, child2);
          done();
          break;
        default:
          throw new Error("should not happen");
      }
    });
  });

  it("doesn't miss children if some are removed during initial emits", function(done) {
    const child1 = Marker('child1'), child2 = Marker('child2');

    const target = new MockElementParent([child1, child2]);

    var i = 0;
    const stream = makeElementChildStream(target);
    stream.onValue(event => {
      switch(++i) {
        case 1:
          assert.strictEqual(event.el, child1);
          target.removeChild(child1);
          break;
        case 2:
          assert.strictEqual(event.el, child2);
          done();
          break;
        default:
          throw new Error("should not happen");
      }
    });
  });

  // Make sure https://github.com/baconjs/bacon.js/issues/574 doesn't affect this.
  it("doesn't cause reentrance issues", function(done) {
    const child1 = Marker('child1'), child2 = Marker('child2');
    const someBus = new Bacon.Bus();
    someBus.onValue(()=>{});

    const target = new MockElementParent([child1, child2]);

    let i = 0, criticalSection = false;
    const stream = makeElementChildStream(target);
    stream.onValue(event => {
      if (criticalSection) {
        throw new Error("Re-entrance");
      }
      criticalSection = true;
      switch(++i) {
        case 1:
          assert.strictEqual(event.el, child1);
          someBus.end();
          break;
        case 2:
          assert.strictEqual(event.el, child2);
          done();
          break;
        default:
          throw new Error("should not happen");
      }
      criticalSection = false;
    });
  });
});
