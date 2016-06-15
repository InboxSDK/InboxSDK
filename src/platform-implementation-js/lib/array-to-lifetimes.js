/* @flow */

import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';

// Takes in a stream of arrays of elements, and returns a stream of
// {el, removalStream} objects (like ElementWithLifetime from
// makeElementChildStream; only difference is that `el` doesn't have to be
// HTMLElement). The removalStream emits an event when the input stream ends,
// when the input stream emits a new array not containing the element, or when
// the output stream is unsubscribed from, similar to makeElementChildStream.

export default function arrayToLifetimes<T>(
  input: Kefir.Stream<Array<T>|NodeList<T>>
): Kefir.Stream<{el: T, removalStream: Kefir.Stream}> {
  return Kefir.stream(emitter => {
    const removalStreams: Map<T, Object> = new Map();

    function listener(event) {
      switch (event.type) {
      case 'value':
        const els = event.value;

        removalStreams.forEach((removalStream, el) => {
          if (Array.prototype.indexOf.call(els, el) < 0) {
            removalStreams.delete(el);
            removalStream.destroy();
          }
        });

        for (let i=0, len=els.length; i<len; i++) {
          const el: T = els[i];
          if (!removalStreams.has(el)) {
            const removalStream = kefirStopper();
            removalStreams.set(el, removalStream);
            emitter.emit({el, removalStream});
          }
        }
        break;
      case 'error':
        emitter.error(event.value);
        break;
      case 'end':
        emitter.end();
      }
    }

    input.onAny(listener);

    return () => {
      removalStreams.forEach(removalStream => {
        removalStream.destroy();
      });
      input.offAny(listener);
    };
  });
}
