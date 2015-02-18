var Bacon = require('baconjs');

// An StopperBus is created from a stopper stream, and can have more stopper
// streams added to it. It has a stream property which is a stopper stream which
// emits a stop event and ends only after all of its input stopper streams have
// stopped.
function StopperBus(streams) {
  this._ended = false;
  this._bus = new Bacon.Bus();

  this.stream = this._bus.filter(false).mapEnd(null);

  this._streamCount = 0;
  this._bus.onValue(() => {
    this._streamCount--;
    if (this._streamCount === 0) {
      this._ended = true;
      this._bus.end();
    }
  });
  this.add(streams);
}

StopperBus.prototype.add = function(newStreams) {
  if (this._ended) {
    throw new Error("Tried to add a stream to a stopped StopperBus");
  }
  if (!Array.isArray(newStreams)) {
    newStreams = [newStreams];
  }
  this._streamCount += newStreams.length;
  this._bus.plug(Bacon.mergeAll(newStreams.map(newStream => newStream.take(1))));
};

StopperBus.prototype.getSize = function() {
  return this._streamCount;
};

module.exports = StopperBus;
