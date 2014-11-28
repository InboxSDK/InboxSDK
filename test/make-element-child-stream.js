var assert = require('assert');
var RSVP = require('./lib/rsvp');
var EventEmitter = require('events').EventEmitter;
var Symbol = require('./lib/symbol');

var makeElementChildStream = require('../src/platform-implementation-js/lib/dom/make-element-child-stream.js');

describe('makeElementChildStream', function() {
  global.MutationObserver = null;
  before(function() {
    global.MutationObserver = require('./lib/mock-mutation-observer');
  });
  after(function() {
    delete global.MutationObserver;
  });

  it('should work', function() {
    return new RSVP.Promise(function(resolve, reject) {
      var child1 = Symbol('child1'), child2 = Symbol('child2'), child3 = Symbol('child3');

      var target = new EventEmitter();
      target._emitsMutations = true;
      target.children = [child1, child2];

      var call = 0;
      makeElementChildStream(target).onValue(function(event) {
        switch(++call) {
          case 1:
            assert.strictEqual(event.type, 'added');
            assert.strictEqual(event.el, child1);
            break;
          case 2:
            assert.strictEqual(event.type, 'added');
            assert.strictEqual(event.el, child2);
            break;
          case 3:
            assert.strictEqual(event.type, 'removed');
            assert.strictEqual(event.el, child1);
            target.emit('mutation', {
              addedNodes: [child3],
              removedNodes: []
            });
            break;
          case 4:
            assert.strictEqual(event.type, 'added');
            assert.strictEqual(event.el, child3);
            resolve();
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
      }, 1);
    });
  });
});
