var Bacon = require('baconjs');
var Map = require('es6-unweak-collections').Map;
var StopperBus = require('../stopper-bus');
var delayImmediate = require('../delay-immediate');

function makeElementStreamMerger() {
  var knownElementStopperBuses = new Map();

  return function(childEvent) {
    var stopperBus = knownElementStopperBuses.get(childEvent.el);
    if (stopperBus) {
      stopperBus.add(childEvent.removalStream.flatMap(delayImmediate));
      return Bacon.never();
    } else {
      stopperBus = new StopperBus(childEvent.removalStream.flatMap(delayImmediate));
      stopperBus.stream.onValue(function() {
        knownElementStopperBuses.delete(childEvent.el);
      });
      knownElementStopperBuses.set(childEvent.el, stopperBus);
      return Bacon.once({
        el: childEvent.el,
        removalStream: stopperBus.stream
      });
    }
  };
}

module.exports = makeElementStreamMerger;
