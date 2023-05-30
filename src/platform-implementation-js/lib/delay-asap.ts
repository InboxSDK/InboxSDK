import asap from 'asap';
import * as Kefir from 'kefir';

// Returns a stream that emits a value in the next event loop run. Works well
// with flatmap.
export default function delayAsap<T>(
  value?: T
): Kefir.Observable<unknown, unknown>;
export default function delayAsap<T>(value: T): Kefir.Observable<T, never> {
  return Kefir.stream((emitter) => {
    asap(() => {
      emitter.emit(value);
      emitter.end();
    });
  });
}
