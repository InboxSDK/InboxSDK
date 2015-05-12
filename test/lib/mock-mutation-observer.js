import assert from 'assert';
import Kefir from 'kefir';

export default class MockMutationObserver {
  constructor(callback) {
    this._callback = callback;
    this._records = [];
    this._updateQueued = false;
    this._stopper = new Kefir.Emitter();
  }

  observe(element, options) {
    assert(element);
    assert(options);

    if (element._emitsMutations) {
      Kefir
        .fromEvents(element, 'mutation')
        .takeUntilBy( Kefir.fromEvents(element, 'removed') )
        .takeUntilBy( this._stopper )
        .map(event => {
          const newEvent = {target: event.target};
          if (options.childList) {
            newEvent.addedNodes = event.addedNodes;
            newEvent.removedNodes = event.removedNodes;
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
    var records = this._records;
    this._records = [];
    return records;
  }

  _queueMutation(mutation) {
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
