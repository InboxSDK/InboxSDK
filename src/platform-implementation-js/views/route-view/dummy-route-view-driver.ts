import * as Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import type { MinRouteViewDriver } from '../../driver-interfaces/route-view-driver';

class DummyRouteViewDriver implements MinRouteViewDriver {
  #eventStream = kefirBus<Record<string, any>, unknown>();
  #stopper = kefirStopper();

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
    return this.#eventStream;
  }

  getStopper(): Kefir.Observable<any, unknown> {
    return this.#stopper;
  }

  destroy() {
    this.#eventStream.end();

    this.#stopper.destroy();
  }
}

export default DummyRouteViewDriver;
