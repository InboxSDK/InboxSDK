import * as Kefir from 'kefir';
import StopperPool from '../stopper-pool';
import delayAsap from '../delay-asap';
import { ItemWithLifetime } from './make-element-child-stream';

export default function makeElementStreamMerger<T>(): (
  event: ItemWithLifetime<T>
) => Kefir.Observable<ItemWithLifetime<T>, never> {
  const knownElementStopperPools: Map<T, StopperPool<null, never>> = new Map();

  return event => {
    let stopperPool = knownElementStopperPools.get(event.el);
    if (stopperPool) {
      if (stopperPool.getSize() > 1) {
        // eslint-disable-next-line no-console
        console.warn(
          'element is part of multiple element streams',
          stopperPool.getSize(),
          event.el
        );
      }
      stopperPool.add(event.removalStream.flatMap(delayAsap));
      return Kefir.never();
    } else {
      stopperPool = new StopperPool(event.removalStream.flatMap(delayAsap));
      stopperPool.stream.onValue(function() {
        knownElementStopperPools.delete(event.el);
      });
      knownElementStopperPools.set(event.el, stopperPool);
      return Kefir.constant({
        el: event.el,
        removalStream: stopperPool.stream
      });
    }
  };
}
