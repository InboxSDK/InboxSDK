/* @flow */

import Kefir from 'kefir';

// Creates a mutation observer watching the given element and emits the events in a stream.
export default function makeMutationObserverChunkedStream(
  element: HTMLElement | Element,
  options: *
): Kefir.Observable<MutationRecord[]> {
  return Kefir.stream(emitter => {
    var observer = new MutationObserver(mutations => {
      // Work around Safari bug where sometimes mutations is an instance of a
      // different context's Array.
      emitter.emit(
        mutations instanceof Array ? mutations : Array.from(mutations)
      );
    });

    observer.observe(element, options);

    return function() {
      observer.disconnect();
    };
  });
}
