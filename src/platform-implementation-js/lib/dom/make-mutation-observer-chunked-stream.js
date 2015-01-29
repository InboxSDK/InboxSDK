var asap = require('asap');
var Bacon = require('baconjs');

// Creates a mutation observer watching the given element and emits the events in a stream.
function makeMutationObserverChunkedStream(element, options) {
  return Bacon.fromBinder(function(sink) {
    var observer = new MutationObserver(function(mutations) {
      sink(mutations);
    });

    observer.observe(element, options);

    return function() {
      observer.disconnect();
    };
  });
}

module.exports = makeMutationObserverChunkedStream;
