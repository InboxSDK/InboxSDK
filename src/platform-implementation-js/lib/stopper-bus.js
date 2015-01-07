var Bacon = require('baconjs');
var Set = require('es6-unweak-collections').Set;

// An StopperBus is created from a stopper stream, and can have more stopper
// streams added to it. It has a stream property which is a stopper stream which
// emits a stop event and ends only after all of its input stopper streams have
// stopped.
function StopperBus(streams) {
  this._ended = false;
  this._bus = new Bacon.Bus();

  // force evaluation of bus so it remembers if it gets ended while no one is
  // listening to it.
  this._bus.onValue(function() {});

  this.stream = this._bus.mapEnd(null);
  this._streams = new Set();
  this.add(streams);
}

StopperBus.prototype.add = function(newStreams) {
  var self = this;
  if (this._ended) {
    throw new Error("Tried to add a stream to a stopped StopperBus");
  }
  if (!Array.isArray(newStreams)) {
    newStreams = [newStreams];
  }
  // All the new streams must be in the set before we listen on them, or else
  // if the first stream synchronously ends, the stopperbus will end there.
  newStreams.forEach(function(newStream) {
    self._streams.add(newStream);
  });
  newStreams.forEach(function(newStream) {
    newStream.take(1).takeUntil(self.stream).onValue(function() {
      self._streams.delete(newStream);
      if (self._streams.size === 0) {
        self._ended = true;
        self._bus.end();
      }
    });
  });
};

module.exports = StopperBus;
