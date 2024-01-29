import * as Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import type { MinRouteViewDriver } from '../../driver-interfaces/route-view-driver';

class DummyRouteViewDriver implements MinRouteViewDriver {
  _eventStream = kefirBus<Record<string, any>, unknown>();
  _stopper = kefirStopper();

  getRouteType() {
    return 'UNKNOWN';
  }

  getRouteID() {
    return 'UNKNOWN';
  }

  getParams() {
    return {};
  }

  getEventStream() {
    return this._eventStream;
  }

  getStopper(): Kefir.Observable<any, unknown> {
    return this._stopper;
  }

  destroy() {
    this._eventStream.end();

    this._stopper.destroy();
  }
}

export default DummyRouteViewDriver;
