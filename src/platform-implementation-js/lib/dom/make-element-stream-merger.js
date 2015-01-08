var Bacon = require('baconjs');
var Map = require('es6-unweak-collections').Map;
var StopperBus = require('../stopper-bus');
var delayImmediate = require('../delay-immediate');

function makeElementStreamMerger() {
  var knownElementStopperBuses = new Map();

  return function(event) {
    var stopperBus = knownElementStopperBuses.get(event.el);
    if (stopperBus) {
      if (stopperBus.getSize() > 1) {
        console.warn('element is part of multiple element streams', stopperBus.getSize(), event.el);
      }
      stopperBus.add(event.removalStream.flatMap(delayImmediate));
      return Bacon.never();
    } else {
      stopperBus = new StopperBus(event.removalStream.flatMap(delayImmediate));
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

module.exports = makeElementStreamMerger;
