const _ = require('lodash');
const asap = require('asap');
const logger = require('../logger');
const Bacon = require('baconjs');

// Emits events whenever the given element has any children added or removed.
// Also when first listened to, it emits events for existing children.
function makeElementChildStream(element) {
  if (!element || !element.nodeType) {
    throw new Error("Expected element, got "+element);
  }

  return Bacon.fromBinder(function(sink) {
    const removalStreams = new Map();

    function newEls(els) {
      const len = els.length;
      if (len === 0) {
        return;
      }
      const toSink = new Array(len);
      for (let i=0; i<len; i++) {
        const el = els[i], removalStream = new Bacon.Bus();
        removalStreams.set(el, removalStream);
        toSink[i] = new Bacon.Next({el, removalStream});
      }
      sink(toSink);
    }

    function removedEl(el) {
      const removalStream = removalStreams.get(el);
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
        newEls(mutation.addedNodes);
        Array.prototype.forEach.call(mutation.removedNodes, removedEl);
      });
    });

    // We don't want to emit the start children synchronously before all
    // stream listeners are subscribed.
    asap(function() {
      if (observer) {
        observer.observe(element, {childList: true});
        newEls(element.children);
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
