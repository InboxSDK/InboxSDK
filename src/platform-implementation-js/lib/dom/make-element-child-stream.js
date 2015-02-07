const _ = require('lodash');
const asap = require('asap');
const logger = require('../logger');
const Bacon = require('baconjs');

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
      } else {
        logger.error(new Error("Could not find removalStream for element with class "+el.className));
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
        observer.observe(element, {childList: true});
        // Children list can change during iteration, so clone it first.
        _.toArray(element.children).slice().forEach(newEl);
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
