const asap = require('asap');
const logger = require('../logger');
const Kefir = require('kefir');

// Emits events whenever the given element has any children added or removed.
// Also when first listened to, it emits events for existing children.
function kefirMakeElementChildStream(element) {
  if (!element || !element.nodeType) {
    throw new Error("Expected element, got "+element);
  }

  return Kefir.fromBinder(function(emitter) {
    const removalStreams = new Map();

    function newEl(el) {
      const removalStream = Kefir.emitter();
      removalStreams.set(el, removalStream);
      emitter.emit({el, removalStream});
    }

    function removedEl(el) {
      const removalStream = removalStreams.get(el);
      removalStreams.delete(el);

      if(removalStream){
        removalStream.emit(null);
        removalStream.end();
      } else {
        logger.error(new Error("Could not find removalStream for element with class "+el.className));
      }
    }

    let observer = new MutationObserver(function(mutations) {
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
        // Clone child list first because it can change
        Array.prototype.slice.call(element.children).forEach(newEl);
      }
    });

    return function() {
      observer.disconnect();
      observer = null;
      removalStreams.forEach(function(removalStream, el) {
        removalStream.emit(null);
        removalStream.end();
      });
    };
  });
}

module.exports = kefirMakeElementChildStream;
