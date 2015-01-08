var Bacon = require('baconjs');

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
  this._streamCount = 0;
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
  this._streamCount += newStreams.length;
  newStreams.forEach(function(newStream) {
    newStream.take(1).takeUntil(self.stream).onValue(function() {
      self._streamCount--;
      if (self._streamCount === 0) {
        self._ended = true;
        self._bus.end();
      }
    });
  });
};

StopperBus.prototype.getSize = function() {
  return this._streamCount;
};

module.exports = StopperBus;
