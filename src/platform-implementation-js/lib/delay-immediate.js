var asap = require('asap');
var Bacon = require('baconjs');

// Takes a stream, and returns a new stream with each item delayed until the
// end of the event loop it was emitted in.
function delayImmediate(stream) {
  return stream.flatMap(function(value) {
    return Bacon.fromBinder(function(sink) {
      asap(function() {
        sink([value, new Bacon.End()]);
      });
    });
  });
}

module.exports = delayImmediate;
