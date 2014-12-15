var RSVP = require('rsvp');
var Bacon = require('baconjs');
var Map = require('es6-unweak-collections').Map;

// Emits events whenever the given element has any children added or removed.
// Also when first listened to, it emits events for existing children.
function makeElementChildStream2(element, stopper) {
  return Bacon.fromBinder(function(sink) {
    var removalStreams = new Map();

    var unsubStopper = stopper.subscribe(function(event) {
      if (event.hasValue()) {
        removalStreams.forEach(function(removalStream, el) {
          removalStream.push(null);
          removalStream.end();
        });
        sink(new Bacon.End());
        return Bacon.noMore;
      }
    });

    function newEl(el) {
      var removalStream = new Bacon.Bus();
      removalStreams.set(el, removalStream);
      sink({el:el, removalStream: removalStream});
    }

    function removedEl(el) {
      var removalStream = removalStreams.get(el);
      removalStreams.delete(el);
      removalStream.push(null);
      removalStream.end();
    }

    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation){
        Array.prototype.forEach.call(mutation.addedNodes, newEl);
        Array.prototype.forEach.call(mutation.removedNodes, removedEl);
      });
    });

    // We don't want to emit the start children synchronously before all
    // stream listeners are subscribed.
    RSVP.Promise.resolve().then(function() {
      if (observer) {
        Array.prototype.forEach.call(element.children, newEl);
        observer.observe(element, {childList: true});
      }
    });

    return function() {
      observer.disconnect();
      observer = null;
      unsubStopper();
    };
  });
}

module.exports = makeElementChildStream2;
