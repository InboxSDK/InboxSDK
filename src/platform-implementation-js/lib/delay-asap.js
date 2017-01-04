/* @flow */

import asap from 'asap';
var Kefir = require('kefir');

// Returns a stream that emits a value in the next event loop run. Works well
// with flatmap.
export default function delayAsap<T>(value: T): Kefir.Observable<T> {
  return Kefir.stream(emitter => {
    asap(() => {
      emitter.emit(value);
      emitter.end();
    });
  });
}
