var assert = require('assert');
var Bacon = require('baconjs');
var EventEmitter = require('events').EventEmitter;
var Symbol = require('../src/common/symbol');

var makeElementChildStream2 = require('../src/platform-implementation-js/lib/dom/make-element-child-stream2.js');

describe('makeElementChildStream2', function() {
  global.MutationObserver = null;
  before(function() {
    global.MutationObserver = require('./lib/mock-mutation-observer');
  });
  after(function() {
    delete global.MutationObserver;
  });

  it('should work', function(done) {
    var child1 = Symbol('child1'), child2 = Symbol('child2'), child3 = Symbol('child3');

    var target = new EventEmitter();
    target._emitsMutations = true;
    target.children = [child1, child2];

    var call = 0;
    makeElementChildStream2(target, Bacon.never()).onValue(function(event) {
      switch(++call) {
        case 1:
          assert.strictEqual(event.el, child1);
          event.removalStream.onValue(function() {
            target.emit('mutation', {
              addedNodes: [child3],
              removedNodes: []
            });
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
      target.emit('mutation', {
        addedNodes: [],
        removedNodes: [child1]
      });
    }, 0);
  });

  it('emits removals when stopper emits', function(done) {
    var child1 = Symbol('child1'), child2 = Symbol('child2');
    var stopper = new Bacon.Bus();

    var target = new EventEmitter();
    target._emitsMutations = true;
    target.children = [child1];

    var call = 0;
    var child1Removed = 0, child2Removed = 0;
    var child1Ended = false, child2Ended = false;
    var stream = makeElementChildStream2(target, stopper);
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
            target.emit('mutation', {
              addedNodes: [child2],
              removedNodes: []
            });
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
          stopper.push();
          break;
        default:
          throw new Error("should not happen");
      }
    });
    stream.onEnd(function() {
      assert.strictEqual(child1Removed, 1);
      assert.strictEqual(child2Removed, 1);
      assert(child1Ended);
      assert(child2Ended);
      done();
    });
  });
});
