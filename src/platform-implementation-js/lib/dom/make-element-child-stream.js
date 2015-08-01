/* @flow */
//jshint ignore:start

import _ from 'lodash';
import asap from 'asap';
import Logger from '../logger';
import * as Bacon from 'baconjs';

// Emits events whenever the given element has any children added or removed.
// Also when first listened to, it emits events for existing children.
export default function makeElementChildStream(element: HTMLElement): Bacon.Observable<{el: HTMLElement, removalStream: Bacon.Observable}> {
  if (!element || !element.nodeType) {
    throw new Error("Expected element, got "+String(element));
  }

  return Bacon.fromBinder(function(sink) {
    var removalStreams = new Map();
    var ended = false;

    function newEls(els) {
      var len = els.length;
      if (len === 0) {
        return;
      }
      var toSink = new Array(len);
      for (var i=0; i<len; i++) {
        var el = els[i], removalStream = new Bacon.Bus();
        removalStreams.set(el, removalStream);
        toSink[i] = new Bacon.Next({el, removalStream});
      }
      sink(toSink);
    }

    function removedEl(el) {
      var removalStream = removalStreams.get(el);
      removalStreams.delete(el);

      if(removalStream){
        removalStream.push(null);
        removalStream.end();
      } else {
        Logger.error(new Error("Could not find removalStream for element with class "+el.className));
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
      if (!ended) {
        observer.observe(element, ({childList: true}: any));
        newEls(element.children);
      }
    });

    return function() {
      ended = true;
      observer.disconnect();
      asap(() => {
        removalStreams.forEach(function(removalStream, el) {
          removalStream.push(null);
          removalStream.end();
        });
      });
    };
  });
}
