import * as Kefir from 'kefir';
import makeMutationObserverChunkedStream from './make-mutation-observer-chunked-stream';

// Creates a mutation observer watching the given element and emits the events in a stream.
export default function makeMutationObserverStream(
  element: HTMLElement,
  options: MutationObserverInit
): Kefir.Observable<MutationRecord, never> {
  return makeMutationObserverChunkedStream(element, options).flatten();
}
