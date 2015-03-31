import asap from 'asap';
import Kefir from 'kefir';

// Returns a stream that emits a value in the next event loop run. Works well
// with flatmap.
export default function kefirDelayAsap(value) {
  return Kefir.fromBinder(emitter => {
    asap(() => {
      emitter.emit(value);
      emitter.end();
    });
  });
}
