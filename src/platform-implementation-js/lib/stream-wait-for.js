/* @flow */

import Kefir from 'kefir';

/**
 * Returns a Kefir stream that repeatedly calls the condition callback until it
 * returns a truthy value, and then the stream emits that value and ends.
 * If the timeout passes, an error event is emitted and the error is also
 * thrown so that it gets logged. Well-behaving code should not let the timeout
 * get tripped.
 */
export default function streamWaitFor<T>(condition:() => ?T, timeout:number=60*1000, steptime:number=250): Kefir.Stream<T> {
  // make this error here so we have a sensible stack.
  const timeoutError = new Error("waitFor timeout");

  const timeoutButSuccessError = new Error("timed out, but condition was true!");

  const timeoutStream = Kefir.later(timeout, null).flatMap(() => {
    const result = condition();
    if (result) {
      return Kefir.constant(result);
    }
    setTimeout(() => {
      throw timeoutError;
    }, 0);
    return Kefir.constantError(timeoutError);
  });

  return Kefir.later(0, null)
    .merge(Kefir.interval(steptime, null))
    .map(() => (condition():any))
    .filter(Boolean)
    .merge(timeoutStream)
    .take(1)
    .takeErrors(1);
}
