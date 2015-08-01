/* @flow */
//jshint ignore:start

import * as Bacon from 'baconjs';

// Creates a mutation observer watching the given element and emits the events in a stream.
export default function makeMutationObserverChunkedStream(element: HTMLElement, options: Object): Bacon.Observable<MutationRecord[]> {
  return Bacon.fromBinder(function(sink) {
    var observer = new MutationObserver(function(mutations) {
      // Work around Safari bug where sometimes mutations is an instance of a
      // different context's Array.
      sink(mutations instanceof Array ? mutations : Array.from(mutations));
    });

    observer.observe(element, options);

    return function() {
      observer.disconnect();
    };
  });
}
