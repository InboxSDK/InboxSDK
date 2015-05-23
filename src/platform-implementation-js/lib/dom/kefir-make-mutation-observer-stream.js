import kefirMakeMutationObserverChunkedStream from './kefir-make-mutation-observer-chunked-stream';

// Creates a mutation observer watching the given element and emits the events in a stream.
export default function kefirMakeMutationObserverStream(element, options) {
  return kefirMakeMutationObserverChunkedStream(element, options).flatten();
}
