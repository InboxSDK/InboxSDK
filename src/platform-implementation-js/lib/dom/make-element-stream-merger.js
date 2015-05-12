import Bacon from 'baconjs';
import StopperBus from '../stopper-bus';
import delayAsap from '../delay-asap';

export default function makeElementStreamMerger() {
  const knownElementStopperBuses = new Map();

  return function(event) {
    let stopperBus = knownElementStopperBuses.get(event.el);
    if (stopperBus) {
      if (stopperBus.getSize() > 1) {
        console.warn('element is part of multiple element streams', stopperBus.getSize(), event.el);
      }
      stopperBus.add(event.removalStream.flatMap(delayAsap));
      return Bacon.never();
    } else {
      stopperBus = new StopperBus(event.removalStream.flatMap(delayAsap));
      stopperBus.stream.onValue(function() {
        knownElementStopperBuses.delete(event.el);
      });
      knownElementStopperBuses.set(event.el, stopperBus);
      return Bacon.once({
        el: event.el,
        removalStream: stopperBus.stream
      });
    }
  };
}
