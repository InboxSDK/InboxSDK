import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import type { MinRouteViewDriver } from '../../driver-interfaces/route-view-driver';

class DummyRouteViewDriver {
  _eventStream = kefirBus();
  _stopper = kefirStopper();

  constructor() {
    this as MinRouteViewDriver;
  }

  getRouteType() {
    return 'UNKNOWN';
  }

  getRouteID() {
    return 'UNKNOWN';
  }

  getParams() {
    return {};
  }

  getEventStream(): Kefir.Observable<Record<string, any>> {
    return this._eventStream;
  }

  getStopper(): Kefir.Observable<any> {
    return this._stopper;
  }

  destroy() {
    this._eventStream.end();

    this._stopper.destroy();
  }
}

export default DummyRouteViewDriver;
