var asap = require('asap');
var Bacon = require('baconjs');

// Returns a stream that emits a value in the next event loop run. Works well
// with flatmap.
function delayAsap(value) {
  return Bacon.fromBinder(function(sink) {
    asap(function() {
      sink([value, new Bacon.End()]);
    });
  });
}

module.exports = delayAsap;
