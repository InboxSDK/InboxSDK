/* @flow */

import assert from 'assert';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';

class MockMutationObserver {
  _callback: (mutations: MutationRecord[]) => void;
  _records: MutationRecord[] = [];
  _updateQueued: boolean = false;
  _stopper = kefirBus();

  constructor(callback: (mutations: MutationRecord[]) => void) {
    this._callback = callback;
  }

  observe(element: Node, options: MutationObserverInit) {
    assert(element);
    assert(options);

    if ((element: any)._emitsMutations) {
      Kefir
        .fromEvents(element, 'mutation')
        .takeUntilBy( Kefir.fromEvents(element, 'removed') )
        .takeUntilBy( this._stopper )
        .map(event => {
          const newEvent: Object = {target: event.target};
          if ((options:any).childList && event.addedNodes) {
            newEvent.addedNodes = event.addedNodes;
            newEvent.removedNodes = event.removedNodes;
          }
          if (
            (options:any).attributes && event.attributeName &&
            (
              !(options:any).attributeFilter ||
              (options:any).attributeFilter.includes(event.attributeName)
            )
          ) {
            newEvent.attributeName = event.attributeName;
          }
          return newEvent;
        })
        .filter(event => Object.keys(event).length > 1)
        .onValue(this._queueMutation.bind(this));
    }
  }

  disconnect() {
    this._stopper.emit('stop');
    this.takeRecords();
  }

  takeRecords() {
    const records = this._records;
    this._records = [];
    return records;
  }

  _queueMutation(mutation: MutationRecord) {
    this._records.push(mutation);
    if (!this._updateQueued) {
      this._updateQueued = true;
      process.nextTick(() => {
        this._updateQueued = false;
        if (this._records.length) {
          this._callback(this.takeRecords());
        }
      });
    }
  }
}

export default ((MockMutationObserver: any): Class<MutationObserver>);
