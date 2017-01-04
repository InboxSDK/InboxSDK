/* @flow */

import Kefir from 'kefir';

const requestIdleCallback = global.requestIdleCallback || (cb => setTimeout(cb, 0));
const cancelIdleCallback = global.cancelIdleCallback || clearTimeout;

// Returns a stream that emits a value using requestIdleCallback. Works well
// with flatmap.
export default function delayIdle<T>(timeout: ?number, value: T): Kefir.Observable<T> {
  return Kefir.stream(emitter => {
    const t = requestIdleCallback(() => {
      emitter.emit(value);
      emitter.end();
    }, timeout == null ? null : {timeout});

    return () => {
      cancelIdleCallback(t);
    };
  });
}
