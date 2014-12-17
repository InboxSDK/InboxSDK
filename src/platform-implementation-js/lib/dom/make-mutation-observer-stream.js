var RSVP = require('rsvp');
var Bacon = require('baconjs');

// Creates a mutation observer watching the given element and emits the events in a stream.
function makeMutationObserverStream(element, options) {
  return Bacon.fromBinder(function(sink) {
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(sink);
    });

    // We don't want to emit the events synchronously before all
    // stream listeners are subscribed.
    RSVP.Promise.resolve().then(function() {
      if (observer) {
        observer.observe(element, options);
      }
    });

    return function() {
      observer.disconnect();
      observer = null;
    };
  });
}

module.exports = makeMutationObserverStream;
