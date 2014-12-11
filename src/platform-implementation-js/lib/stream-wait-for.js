var Bacon = require('baconjs');

/**
 * Returns a Bacon stream that repeated calls the condition callback until it
 * returns a truthy value, and then the stream emits that value and ends.
 * If the timeout passes, a Bacon.Error event is emitted and the error is
 * thrown so that it gets logged. Well-behaving code should not let the timeout
 * get tripped.
 */
function streamWaitFor(condition, timeout, steptime) {
  // make this error here so we have a sensible stack.
  var timeoutError = new Error("waitFor timeout");

  if (!timeout) {
    timeout = 60*1000;
  }
  if (!steptime) {
    steptime = 250;
  }

  var waited = 0;

  var timeoutStream = Bacon.later(timeout).flatMap(function() {
    setTimeout(function() {
      throw timeoutError;
    }, 0);
    return new Bacon.Error(timeoutError);
  });

  return Bacon.later(0).merge(
    Bacon.interval(steptime)
  ).flatMap(function() {
    return Bacon.once(condition());
  }).filter(Boolean).merge(timeoutStream).take(1).endOnError();
}

module.exports = streamWaitFor;
