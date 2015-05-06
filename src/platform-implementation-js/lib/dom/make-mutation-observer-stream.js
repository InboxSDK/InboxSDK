import Bacon from 'baconjs';
import makeMutationObserverChunkedStream from './make-mutation-observer-chunked-stream';
import baconFlatten from '../bacon-flatten';

// Creates a mutation observer watching the given element and emits the events in a stream.

export default function makeMutationObserverStream(element, options) {
  return baconFlatten(makeMutationObserverChunkedStream(element, options));
}
