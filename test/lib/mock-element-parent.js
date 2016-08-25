const assert = require('assert');
const _ = require('lodash');
const EventEmitter = require('events').EventEmitter;

// Mock element suitable for use with MockMutationObserver
class MockElementParent extends EventEmitter {
  constructor(children=[]) {
    super();
    assert(Array.isArray(children), 'children must be array');
    this.children = children;
  }

  appendAndRemoveChildren(toAdd=[], toRemove=[]) {
    const presentTargets = [];
    for (let target of toRemove) {
      const ix = this.children.indexOf(target);
      if (ix >= 0) {
        target.parentElement = null;
        presentTargets.push(target);
        this.children.splice(ix, 1);
      } else {
        throw new Error("Tried to remove child that wasn't present");
      }
    }
    for (let target of toAdd) {
      target.parentElement = this;
      this.children.push(target);
    }
    this.emit('mutation', {
      addedNodes: toAdd,
      removedNodes: presentTargets
    });
  }

  appendChildren(targets) {
    return this.appendAndRemoveChildren(targets, undefined);
  }

  removeChildren(targets) {
    return this.appendAndRemoveChildren(undefined, targets);
  }

  appendChild(target) {
    return this.appendChildren([target]);
  }

  removeChild(target) {
    return this.removeChildren([target]);
  }
}

MockElementParent.prototype._emitsMutations = true;
MockElementParent.prototype.nodeType = 1;

module.exports = MockElementParent;
