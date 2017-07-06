/* @flow */

const assert = require('assert');
const EventEmitter = require('events').EventEmitter;

// Mock element suitable for use with MockMutationObserver
class MockElementParent extends EventEmitter {
  children: Object[];

  constructor(children: Object[]=[]) {
    super();
    assert(Array.isArray(children), 'children must be array');
    this.children = children;
  }

  appendAndRemoveChildren(toAdd: Object[]=[], toRemove: Object[]=[]) {
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

  appendChildren(targets: Object[]) {
    return this.appendAndRemoveChildren(targets, undefined);
  }

  removeChildren(targets: Object[]) {
    return this.appendAndRemoveChildren(undefined, targets);
  }

  appendChild(target: Object) {
    return this.appendChildren([target]);
  }

  removeChild(target: Object) {
    return this.removeChildren([target]);
  }
}

(MockElementParent:any).prototype._emitsMutations = true;
(MockElementParent:any).prototype.nodeType = 1;

export default MockElementParent;
