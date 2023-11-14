import assert from 'node:assert';
import EventEmitter from 'events';

// Mock element suitable for use with MockMutationObserver
export default class MockElementParent extends EventEmitter {
  children: any[];
  _emitsMutations = true;
  nodeType = 1;

  constructor(children: any[] = []) {
    super();
    assert(Array.isArray(children), 'children must be array');
    this.children = children;
  }

  appendAndRemoveChildren(toAdd: any[] = [], toRemove: any[] = []) {
    const presentTargets = [];
    for (const target of toRemove) {
      const ix = this.children.indexOf(target);
      if (ix >= 0) {
        target.parentElement = null;
        presentTargets.push(target);
        this.children.splice(ix, 1);
      } else {
        throw new Error("Tried to remove child that wasn't present");
      }
    }
    for (const target of toAdd) {
      target.parentElement = this;
      this.children.push(target);
    }
    this.emit('mutation', {
      addedNodes: toAdd,
      removedNodes: presentTargets,
    });
  }

  appendChildren(targets: any[]) {
    return this.appendAndRemoveChildren(targets, undefined);
  }

  removeChildren(targets: any[]) {
    return this.appendAndRemoveChildren(undefined, targets);
  }

  appendChild(target: any) {
    return this.appendChildren([target]);
  }

  removeChild(target: any) {
    return this.removeChildren([target]);
  }
}
