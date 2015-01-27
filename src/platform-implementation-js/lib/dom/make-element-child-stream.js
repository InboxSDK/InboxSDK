var asap = require('asap');
var Bacon = require('baconjs');
var Map = require('es6-unweak-collections').Map;

// Emits events whenever the given element has any children added or removed.
// Also when first listened to, it emits events for existing children.
function makeElementChildStream(element) {
  return Bacon.fromBinder(function(sink) {
    var removalStreams = new Map();

    function newEl(el) {
      var removalStream = new Bacon.Bus();
      removalStreams.set(el, removalStream);
      sink({el:el, removalStream: removalStream});
    }

    function removedEl(el) {
      var removalStream = removalStreams.get(el);
      removalStreams.delete(el);

      if(removalStream){
        removalStream.push(null);
        removalStream.end();
      }
    }

    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation){
        Array.prototype.forEach.call(mutation.addedNodes, newEl);
        Array.prototype.forEach.call(mutation.removedNodes, removedEl);
      });
    });

    // We don't want to emit the start children synchronously before all
    // stream listeners are subscribed.
    asap(function() {
      if (observer) {
        Array.prototype.forEach.call(element.children, newEl);
        observer.observe(element, {childList: true});
      }
    });

    return function() {
      observer.disconnect();
      observer = null;
      removalStreams.forEach(function(removalStream, el) {
        removalStream.push(null);
        removalStream.end();
      });
    };
  });
}

module.exports = makeElementChildStream;
