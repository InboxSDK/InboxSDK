var Bacon = require('baconjs');

var makeElementChildStream2 = require('./make-element-child-stream2');

// DEPRECATED, use make-element-child-stream2.
// Emits events whenever the given element has any children added or removed.
// Also when first listened to, it emits events for existing children.
function makeElementChildStream(element) {
  return makeElementChildStream2(element, Bacon.never()).flatMap(function(newEvent) {
    return Bacon.once({
      type: 'added',
      el: newEvent.el
    }).merge(
      newEvent.removalStream.map(function() {
        return {
          type: 'removed',
          el: newEvent.el
        };
      })
    );
  });
}

module.exports = makeElementChildStream;
