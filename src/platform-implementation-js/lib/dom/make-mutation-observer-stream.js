var Bacon = require('baconjs');
var makeMutationObserverChunkedStream = require('./make-mutation-observer-chunked-stream');

// Creates a mutation observer watching the given element and emits the events in a stream.

function makeMutationObserverStream(element, options) {
  return makeMutationObserverChunkedStream(element, options)
    .flatMap(Bacon.fromArray);
}

module.exports = makeMutationObserverStream;
