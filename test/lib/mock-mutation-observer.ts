import assert from 'assert';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';

export default class MockMutationObserver {
  private _callback: (mutations: MutationRecord[]) => void;
  private _records: MutationRecord[] = [];
  private _updateQueued: boolean = false;
  private _stopper = kefirBus();

  public constructor(callback: (mutations: MutationRecord[]) => void) {
    this._callback = callback;
  }

  public observe(element: Node, options: MutationObserverInit) {
    assert(element);
    assert(options);

    if ((element as any)._emitsMutations) {
      Kefir.fromEvents(element, 'mutation')
        .takeUntilBy(Kefir.fromEvents(element, 'removed'))
        .takeUntilBy(this._stopper)
        .map((event: any) => {
          const newEvent: any = { target: event.target };
          if ((options as any).childList && event.addedNodes) {
            newEvent.addedNodes = event.addedNodes;
            newEvent.removedNodes = event.removedNodes;
          }
          if (
            (options as any).attributes &&
            event.attributeName &&
            (!(options as any).attributeFilter ||
              (options as any).attributeFilter.includes(event.attributeName))
          ) {
            newEvent.attributeName = event.attributeName;
          }
          return newEvent;
        })
        .filter(event => Object.keys(event).length > 1)
        .onValue(this._queueMutation.bind(this));
    }
  }

  public disconnect() {
    this._stopper.emit('stop');
    this.takeRecords();
  }

  public takeRecords() {
    const records = this._records;
    this._records = [];
    return records;
  }

  public _queueMutation(mutation: MutationRecord) {
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
