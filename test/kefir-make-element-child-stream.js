const assert = require('assert');
const Kefir = require('kefir');
const EventEmitter = require('events').EventEmitter;
const Marker = require('../src/common/marker');
const MockElementParent = require('./lib/mock-element-parent');

const kefirMakeElementChildStream = require('../src/platform-implementation-js/lib/dom/kefir-make-element-child-stream');

describe('kefirMakeElementChildStream', function() {
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
    kefirMakeElementChildStream(target).onValue(function(event) {
      switch(++call) {
        case 1:
          assert.strictEqual(event.el, child1);
          event.removalStream.onValue(function() {
            target.appendChild(child3);
          });
          break;
        case 2:
          assert.strictEqual(event.el, child2);
          assert(event.removalStream instanceof Kefir.Stream);
          break;
        case 3:
          assert.strictEqual(event.el, child3);
          assert(event.removalStream instanceof Kefir.Stream);
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
    var stopper = new Kefir.Emitter();

    const target = new MockElementParent([child1]);

    var call = 0;
    var child1Removed = 0, child2Removed = 0;
    var child1Ended = false, child2Ended = false;
    var stream = kefirMakeElementChildStream(target).takeUntilBy(stopper);
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
          stopper.emit();
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
    const stream = kefirMakeElementChildStream(target);
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
    const stream = kefirMakeElementChildStream(target);
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
});
