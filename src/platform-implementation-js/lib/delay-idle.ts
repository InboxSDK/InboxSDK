import * as Kefir from 'kefir';

const requestIdleCallback =
  (global as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 0));
const cancelIdleCallback = (global as any).cancelIdleCallback || clearTimeout;

// Returns a stream that emits a value using requestIdleCallback. Works well
// with flatmap.
export default function delayIdle<T>(
  timeout: number | null,
  value: T
): Kefir.Observable<T, never> {
  return Kefir.stream(emitter => {
    const t = requestIdleCallback(
      () => {
        emitter.emit(value);
        emitter.end();
      },
      timeout == null ? null : { timeout }
    );

    return () => {
      cancelIdleCallback(t);
    };
  });
}
