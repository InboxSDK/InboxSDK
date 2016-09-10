/* @flow */
//jshint ignore:start

import Kefir from 'kefir';
import makeMutationObserverChunkedStream from './make-mutation-observer-chunked-stream';

// Creates a mutation observer watching the given element and emits the events in a stream.
export default function makeMutationObserverStream(element: HTMLElement, options: *): Kefir.Observable<MutationRecord> {
  return makeMutationObserverChunkedStream(element, options).flatten();
}
