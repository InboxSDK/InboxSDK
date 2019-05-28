import * as Kefir from 'kefir';

// An StopperPool is created from a stopper stream, and can have more stopper
// streams added to it. It has a stream property which is a stopper stream which
// emits a stop event and ends only after all of its input stopper streams have
// stopped.
export default class StopperPool {
  private _streamCount: number = 0;
  private _ended: boolean = false;
  private _pool = Kefir.pool<any, any>();
  public stream: Kefir.Observable<any, any>;

  public constructor(
    streams: Kefir.Observable<any, any> | Kefir.Observable<any, any>[]
  ) {
    this.stream = this._pool
      .filter(() => {
        this._streamCount--;
        if (this._streamCount === 0) {
          this._ended = true;
          return true;
        }
        return false;
      })
      .take(1)
      .toProperty();

    // force stream to be active so this._streamCount, this._ended, and the
    // property's cached value will be kept up-to-date
    this.stream.onValue(() => {});

    this.add(streams);
  }

  public add(
    newStreams: Kefir.Observable<any, any> | Kefir.Observable<any, any>[]
  ) {
    if (this._ended) {
      throw new Error('Tried to add a stream to a stopped StopperPool');
    }
    const arrStreams = Array.isArray(newStreams) ? newStreams : [newStreams];
    this._streamCount += arrStreams.length;
    this._pool.plug(
      Kefir.merge(arrStreams.map(newStream => newStream.take(1)))
    );
  }

  public getSize(): number {
    return this._streamCount;
  }
}
