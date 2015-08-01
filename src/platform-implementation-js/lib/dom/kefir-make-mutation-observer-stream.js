/* @flow */
//jshint ignore:start

import Kefir from 'kefir';
import kefirMakeMutationObserverChunkedStream from './kefir-make-mutation-observer-chunked-stream';

// Creates a mutation observer watching the given element and emits the events in a stream.
export default function kefirMakeMutationObserverStream(element: HTMLElement, options: Object): Kefir.Stream<MutationRecord> {
  return kefirMakeMutationObserverChunkedStream(element, options).flatten();
}
