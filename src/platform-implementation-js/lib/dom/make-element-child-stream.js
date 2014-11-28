var RSVP = require('rsvp');
var Bacon = require('baconjs');

// Emits events whenever the given element has any children added or removed.
// Also when first listened to, it emits events for existing children.
function makeElementChildStream(element) {
  return Bacon.fromBinder(function(sink) {
    // We don't want to emit the start children synchronously before all
    // stream listeners are subscribed.
    RSVP.Promise.resolve().then(function() {
      if (observer) {
        Array.prototype.forEach.call(element.children, function(node) {
          sink({type:'added', el:node});
        });
        observer.observe(element, {childList: true});
      }
    });

    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation){
        Array.prototype.forEach.call(mutation.addedNodes, function(node) {
          sink({type:'added', el:node});
        });
        Array.prototype.forEach.call(mutation.removedNodes, function(node) {
          sink({type:'removed', el:node});
        });
      });
    });

    return function() {
      observer.disconnect();
      observer = null;
    };
  });
}

module.exports = makeElementChildStream;
