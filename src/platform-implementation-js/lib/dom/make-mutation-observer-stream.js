/* @flow */
//jshint ignore:start

import type Bacon from 'baconjs';
import makeMutationObserverChunkedStream from './make-mutation-observer-chunked-stream';
import baconFlatten from '../bacon-flatten';

// Creates a mutation observer watching the given element and emits the events in a stream.

export default function makeMutationObserverStream(element: HTMLElement, options: Object): Bacon.Observable<MutationRecord> {
  return baconFlatten(makeMutationObserverChunkedStream(element, options));
}
