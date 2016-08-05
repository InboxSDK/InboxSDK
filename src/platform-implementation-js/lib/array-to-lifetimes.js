/* @flow */

import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';

import type {ItemWithLifetime} from './dom/make-element-child-stream';

// Takes in a stream of arrays of elements, and returns a stream of
// ItemWithLifetime objects. The removalStream emits an event when the input
// stream ends, when the input stream emits a new array not containing the
// element, or when the output stream is unsubscribed from, similar to
// makeElementChildStream.

type Stopper = Kefir.Stream<any>&{destroy(): void};

export default function arrayToLifetimes<T>(
  input: Kefir.Stream<Array<T>|NodeList<T>>,
  keyFn?: (value: T) => any
): Kefir.Stream<ItemWithLifetime<T>> {
  return Kefir.stream(emitter => {
    const items: Map<any, {el: T, removalStream: Stopper}> = new Map();

    function listener(event) {
      switch (event.type) {
      case 'value':
        const els = event.value;
        const elKeys = keyFn ? Array.prototype.map.call(els, keyFn) : els;

        items.forEach(({el, removalStream}, key) => {
          if (Array.prototype.indexOf.call(elKeys, key) < 0) {
            items.delete(key);
            removalStream.destroy();
          }
        });

        for (let i=0, len=els.length; i<len; i++) {
          const el: T = els[i];
          const elKey = elKeys[i];
          if (!items.has(elKey)) {
            const removalStream = kefirStopper();
            const itemWithLifetime = {el, removalStream};
            items.set(elKey, itemWithLifetime);
            emitter.emit(itemWithLifetime);
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
      items.forEach(({removalStream}) => {
        removalStream.destroy();
      });
      input.offAny(listener);
    };
  });
}
