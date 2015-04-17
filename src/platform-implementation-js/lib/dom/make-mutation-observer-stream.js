import Bacon from 'baconjs';
import makeMutationObserverChunkedStream from './make-mutation-observer-chunked-stream';
import baconFlatten from '../bacon-flatten';

// Creates a mutation observer watching the given element and emits the events in a stream.

function makeMutationObserverStream(element, options) {
  return baconFlatten(makeMutationObserverChunkedStream(element, options));
}

module.exports = makeMutationObserverStream;
