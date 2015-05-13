import Bacon from 'baconjs';

/**
 * Returns a Bacon stream that repeatedly calls the condition callback until it
 * returns a truthy value, and then the stream emits that value and ends.
 * If the timeout passes, a Bacon.Error event is emitted and the error is also
 * thrown so that it gets logged. Well-behaving code should not let the timeout
 * get tripped.
 */
export default function streamWaitFor(condition, timeout=60*1000, steptime=250) {
  // make this error here so we have a sensible stack.
  const timeoutError = new Error("waitFor timeout");

  const timeoutStream = Bacon.later(timeout).flatMap(() => {
    setTimeout(() => {
      throw timeoutError;
    }, 0);
    return new Bacon.Error(timeoutError);
  });

  return Bacon.later(0).merge(
    Bacon.interval(steptime)
  ).flatMap(() =>
    Bacon.once(condition())
  ).filter(Boolean).merge(timeoutStream).take(1).endOnError();
}
