var Bacon = require('baconjs');
var Set = require('es6-unweak-collections').Set;

// An StopperBus is created from a stopper stream, and can have more stopper
// streams added to it. It has a stream property which is a stopper stream which
// emits a stop event and ends only after all of its input stopper streams have
// stopped.
function StopperBus(stream) {
  this._ended = false;
  this._bus = new Bacon.Bus();

  // force evaluation of bus so it remembers if it gets ended while no one is
  // listening to it.
  this._bus.onValue(function() {});

  this.stream = this._bus.mapEnd(null);
  this._streams = new Set();
  this.add(stream);
}

StopperBus.prototype.add = function(newStream) {
  var self = this;
  if (this._ended) {
    return;
  }
  this._streams.add(newStream);
  newStream.takeUntil(this.stream).onValue(function() {
    self._streams.delete(newStream);
    if (self._streams.size === 0) {
      self._ended = true;
      self._bus.end();
    }
  });
};

module.exports = StopperBus;
