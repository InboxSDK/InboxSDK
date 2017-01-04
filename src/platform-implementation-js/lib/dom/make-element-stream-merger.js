/* @flow */

import Kefir from 'kefir';
import StopperPool from '../stopper-pool';
import delayAsap from '../delay-asap';
import type {ItemWithLifetime} from './make-element-child-stream';

export default function makeElementStreamMerger<T>(): (event: ItemWithLifetime<T>) => Kefir.Observable<ItemWithLifetime<T>> {
  const knownElementStopperPools: Map<T, StopperPool> = new Map();

  return function(event) {
    let stopperPool = knownElementStopperPools.get(event.el);
    if (stopperPool) {
      if (stopperPool.getSize() > 1) {
        console.warn('element is part of multiple element streams', stopperPool.getSize(), event.el);
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
