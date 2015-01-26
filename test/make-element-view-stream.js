var assert = require('assert');
var Bacon = require('baconjs');
var EventEmitter = require('events').EventEmitter;
var Marker = require('../src/common/marker');

var makeElementViewStream = require('../src/platform-implementation-js/lib/dom/make-element-view-stream');
var makeElementChildStream = require('../src/platform-implementation-js/lib/dom/make-element-child-stream');

describe('makeElementViewStream', function() {
  global.MutationObserver = null;
  before(function() {
    global.MutationObserver = require('./lib/mock-mutation-observer');
  });
  after(function() {
    delete global.MutationObserver;
  });

  it('should work with makeElementChildStream', function(done) {
    var child1 = Marker('child1'), child2 = Marker('child2'), child3 = Marker('child3');

    var stopper = new Bacon.Bus();
    var activeViewCount = 0;

    var target = new EventEmitter();
    target._emitsMutations = true;
    target.children = [child1, child2];

    var call = 0;
    makeElementChildStream(target)
      .takeUntil(stopper)
      .flatMap(makeElementViewStream(function(el) {
        activeViewCount++;
        return {
          el: el,
          destroy: function() {
            activeViewCount--;
            if (el === child2) {
              target.emit('mutation', {
                addedNodes: [child3],
                removedNodes: []
              });
            } else if (activeViewCount === 0) {
              done();
            }
          }
        };
      })).onValue(function(view) {
        switch(++call) {
          case 1:
            assert.strictEqual(view.el, child1);
            break;
          case 2:
            assert.strictEqual(view.el, child2);
            break;
          case 3:
            assert.strictEqual(view.el, child3);
            stopper.push('beep');
            break;
          default:
            throw new Error("should not happen");
        }
      });

    setTimeout(function() {
      target.emit('mutation', {
        addedNodes: [],
        removedNodes: [child2]
      });
    }, 0);
  });
});
