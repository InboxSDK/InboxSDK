var Bacon = require('baconjs');

function fromEventTargetCapture(target, eventName) {
  return Bacon.fromBinder(function(sink) {
    target.addEventListener(eventName, sink, true);
    return function() {
      target.removeEventListener(eventName, sink, true);
    };
  });
}

module.exports = fromEventTargetCapture;
