import asap from 'asap';
import Bacon from 'baconjs';

/**
 * Returns a Bacon stream that repeated calls the condition callback until it
 * returns a truthy value, and then the stream emits that value and ends.
 * If the timeout passes, a Bacon.Error event is emitted and the error is
 * thrown so that it gets logged. Well-behaving code should not let the timeout
 * get tripped.
 */
export default function streamWaitFor(condition, timeout, steptime) {
  // make this error here so we have a sensible stack.
  const timeoutError = new Error("waitFor timeout");

  if (!timeout) {
    timeout = 60*1000;
  }
  if (!steptime) {
    steptime = 250;
  }

  const timeoutStream = Bacon.later(timeout).flatMap(function() {
    setTimeout(function() {
      throw timeoutError;
    }, 0);
    return new Bacon.Error(timeoutError);
  });

  return Bacon.fromCallback(asap).merge(
    Bacon.interval(steptime)
  ).flatMap(function() {
    return Bacon.once(condition());
  }).filter(Boolean).merge(timeoutStream).take(1).endOnError();
}
