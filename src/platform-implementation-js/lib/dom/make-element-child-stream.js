var Bacon = require('baconjs');

// Emits events whenever the given element has any children added or removed.
// Also when first listened to, it emits events for existing children.
function makeElementChildStream(element) {
  return Bacon.fromBinder(function(sink) {
    Array.prototype.forEach.call(element.children, function(node){
      sink({type:'added', el:node});
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
    observer.observe(element, {childList: true});
    return function() {
      observer.disconnect();
    };
  });
}

module.exports = makeElementChildStream;
