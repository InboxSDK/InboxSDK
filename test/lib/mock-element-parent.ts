import assert from 'assert';
import EventEmitter from 'events';

// Mock element suitable for use with MockMutationObserver
export default class MockElementParent extends EventEmitter {
  public children: any[];
  public _emitsMutations = true;
  public nodeType = 1;

  public constructor(children: any[] = []) {
    super();
    assert(Array.isArray(children), 'children must be array');
    this.children = children;
  }

  public appendAndRemoveChildren(toAdd: any[] = [], toRemove: any[] = []) {
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

  public appendChildren(targets: any[]) {
    return this.appendAndRemoveChildren(targets, undefined);
  }

  public removeChildren(targets: any[]) {
    return this.appendAndRemoveChildren(undefined, targets);
  }

  public appendChild(target: any) {
    return this.appendChildren([target]);
  }

  public removeChild(target: any) {
    return this.removeChildren([target]);
  }
}
